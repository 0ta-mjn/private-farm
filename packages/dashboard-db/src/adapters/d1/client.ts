import { AnyD1Database, drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";
import {
  D1DiaryRepo,
  D1DiscordRepo,
  D1OrganizationRepo,
  D1ThingRepo,
  D1UserRepo,
} from "./repositories";
import { DashboardDB } from "../../interfaces";

export type Database = ReturnType<typeof DashboardD1Client>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const DashboardD1Client = (d1: AnyD1Database) => {
  return drizzle(d1, {
    schema,
    casing: "snake_case",
  });
};

export type DashboardD1DBParams = {
  d1: AnyD1Database;
  encryptionKey: string;
};

export const DashboardD1DB = ({
  d1,
  encryptionKey,
}: DashboardD1DBParams): DashboardDB => {
  const db = DashboardD1Client(d1);
  return {
    user: new D1UserRepo(db),
    organization: new D1OrganizationRepo(db, encryptionKey),
    thing: new D1ThingRepo(db),
    diary: new D1DiaryRepo(db),
    discord: new D1DiscordRepo(db, encryptionKey),
  };
};
