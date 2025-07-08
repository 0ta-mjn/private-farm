import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import postgres from "postgres";

export type Database = ReturnType<typeof dbClient>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const dbClient = (url?: string) => {
  url = url || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Either DATABASE_URL environment variable or url parameter must be provided"
    );
  }

  const client = postgres(url);

  return drizzle({
    client,
    schema,
    casing: "snake_case",
  });
};
