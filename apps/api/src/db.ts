import { Context } from "hono";
import { HonoEnv } from "./env";
import { env } from "hono/adapter";
import { createDashboardDBClient } from "@repo/dashboard-db";

export const getDashboardDB = (c: Context<HonoEnv>) => {
  const e = env<{
    DASHBOARD_DB_PROVIDER: "d1" | string; // 他のプロバイダーが追加される可能性があるため、string型も許容
    ENCRYPTION_KEY: string | undefined;
  }>(c);
  if (!e.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables.");
  }
  switch (e.DASHBOARD_DB_PROVIDER) {
    case "d1":
    default:
      if (!c.env.DashboardDB) {
        throw new Error("DashboardDB is not set in environment variables.");
      }
      return createDashboardDBClient({
        type: "d1",
        params: {
          d1: c.env.DashboardDB,
          encryptionKey: e.ENCRYPTION_KEY,
        },
      });
  }
};
