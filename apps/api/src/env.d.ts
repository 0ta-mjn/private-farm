import { Database } from "@repo/db/client";
import { DiscordRegistrationKeys } from "@repo/discord";
import { Session, Supabase } from "@repo/supabase";
import { BlankEnv } from "hono/types";

export type HonoEnv = BlankEnv & {
  Variables: {
    db: Database;
    supabase: Supabase;
    session: Session | undefined;
    userId: string | undefined;
    discordKeys: DiscordRegistrationKeys;
  };
};

export type AuthenticatedEnv = HonoEnv & {
  Variables: {
    db: Database;
    supabase: Supabase;
    session: Session;
    userId: string;
  };
};
