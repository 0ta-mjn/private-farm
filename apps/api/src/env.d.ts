import { Database } from "@repo/db/client";
import { DiscordRegistrationKeys } from "@repo/discord";
import { BlankEnv } from "hono/types";
import { AuthProvider } from "@repo/auth-admin";

export type HonoEnv = BlankEnv & {
  Variables: {
    db: Database;
    auth: AuthProvider;
    userId: string | undefined;
    discordKeys: DiscordRegistrationKeys;
  };
};

export type AuthenticatedEnv = HonoEnv & {
  Variables: {
    db: Database;
    auth: AuthProvider;
    userId: string;
  };
};
