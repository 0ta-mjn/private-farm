import { getAuthProvider } from "@repo/auth-admin";
import { Context } from "hono";
import { HonoEnv } from "./env";
import { env } from "hono/adapter";

export const getAuth = (c: Context<HonoEnv>) => {
  const e = env<{
    SUPABASE_URL: string | undefined;
    SUPABASE_KEY: string | undefined;
    AUTH_PROVIDER: "supabase" | string; // 他のプロバイダーが追加される可能性があるため、string型も許容
  }>(c);
  switch (e.AUTH_PROVIDER) {
    case "supabase":
    default:
      if (!e.SUPABASE_URL || !e.SUPABASE_KEY) {
        throw new Error(
          "Supabase URL or key is not set in environment variables."
        );
      }
      return getAuthProvider({
        provider: "supabase",
        config: {
          supabaseUrl: e.SUPABASE_URL,
          supabaseKey: e.SUPABASE_KEY,
        },
      });
  }
};
