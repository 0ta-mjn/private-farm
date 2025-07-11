import { AnyD1Database, drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";
import { SensorDB } from "../../interfaces";
import { D1SensorIngestRepository } from "./repositories/ingest";

export type Database = ReturnType<typeof SensorD1Client>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const SensorD1Client = (d1: AnyD1Database) => {
  return drizzle(d1, {
    schema,
    casing: "snake_case",
  });
};

export type SensorD1DBParams = {
  d1: AnyD1Database;
};

export const SensorD1DB = ({ d1 }: SensorD1DBParams): SensorDB => {
  const db = SensorD1Client(d1);
  return {
    ingest: new D1SensorIngestRepository(db),
  };
};
