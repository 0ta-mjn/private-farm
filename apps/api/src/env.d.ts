import { AnyD1Database, DashboardDB } from "@repo/dashboard-db";
import { DiscordRegistrationKeys } from "@repo/discord";
import { BlankEnv } from "hono/types";
import { AuthProvider } from "@repo/auth-admin";

export type HonoEnv = BlankEnv & {
  Bindings: {
    DashboardDB?: AnyD1Database;
  };
  Variables: {
    dashboardDB: DashboardDB;
    auth: AuthProvider;
    userId: string | undefined;
    discordKeys: DiscordRegistrationKeys;
  };
};

export type AuthenticatedEnv = HonoEnv & {
  Variables: {
    dashboardDB: DashboardDB;
    auth: AuthProvider;
    userId: string;
  };
};
