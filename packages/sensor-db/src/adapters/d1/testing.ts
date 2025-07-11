import { Miniflare } from "miniflare";
import { SensorD1Client } from "./client";
import { migrate } from "drizzle-orm/d1/migrator";
import path from "path";
import { SensorDB } from "../../interfaces";
import { D1SensorIngestRepository } from "./repositories/ingest";
import { observationsTable } from "./schema";

const migrationDirectory = path.join(__dirname, "../../../migrations/d1");

export const createTestSensorD1Client = async (
  DBBingingName = "SensorD1Test"
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

  const db = SensorD1Client(rawDB);

  await migrate(db, {
    migrationsFolder: migrationDirectory,
  });

  return db;
};

export const createTestSensorD1DB = async (
  DBBingingName = "SensorD1Test"
): Promise<SensorDB & { reset: () => Promise<void> }> => {
  const db = await createTestSensorD1Client(DBBingingName);
  return {
    ingest: new D1SensorIngestRepository(db),
    reset: async () => {
      await db.delete(observationsTable);
    },
  };
};
