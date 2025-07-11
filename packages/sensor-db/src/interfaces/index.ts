import { SensorIngestRepository } from "./ingest";

export interface SensorDB {
  ingest: SensorIngestRepository;
}

export type { AnyD1Database } from "drizzle-orm/d1";

export * from "./ingest";
