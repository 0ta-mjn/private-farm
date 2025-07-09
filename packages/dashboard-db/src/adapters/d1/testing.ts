import { Miniflare } from "miniflare";
import { DashboardD1Client } from "./client";
import { migrate } from "drizzle-orm/d1/migrator";
import path from "path";
import {
  D1UserRepo,
  D1OrganizationRepo,
  D1ThingRepo,
  D1DiaryRepo,
  D1DiscordRepo,
} from "./repositories";
import { DashboardDB } from "../../interfaces";
import { diariesTable, diaryThingsTable, discordChannelsTable, organizationMembersTable, organizationsTable, thingsTable, usersTable } from "./schema";

const migrationDirectory = path.join(__dirname, "../../../migrations/d1");

export const createTestDashboardD1Client = async (
  DBBingingName = "DashboardD1Test"
) => {
  const mf = new Miniflare({
    script: `addEventListener("fetch", (event) => {
    event.respondWith(new Response("Hello Miniflare!"));
  })`,
    d1Persist: false,
    modules: true,
    d1Databases: {
      DB: DBBingingName,
    },
  });

  const rawDB = await mf.getD1Database("DB");

  const db = DashboardD1Client(rawDB);

  await migrate(db, {
    migrationsFolder: migrationDirectory,
  });

  return db;
};

export const createTestDashboardD1DB = async (
  DBBingingName = "DashboardD1Test",
  encryptionKey = "e52806871df18726eaf7ee648b7711ecd6709e6cf37b728cd60399c84982f0ea" // 32bytes Hex Key
): Promise<DashboardDB & { reset: () => Promise<void> }> => {
  const db = await createTestDashboardD1Client(DBBingingName);
  return {
    user: new D1UserRepo(db),
    organization: new D1OrganizationRepo(db, encryptionKey),
    thing: new D1ThingRepo(db),
    diary: new D1DiaryRepo(db),
    discord: new D1DiscordRepo(db, encryptionKey),
    reset: async () => {
      await db.delete(diaryThingsTable);
      await db.delete(diariesTable);
      await db.delete(thingsTable);
      await db.delete(organizationMembersTable);
      await db.delete(discordChannelsTable);
      await db.delete(organizationsTable);
      await db.delete(usersTable);
    },
  };
};
