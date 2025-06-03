import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema.js";
import postgres from "postgres";

export const dbClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  const client = postgres(process.env.DATABASE_URL);

  return drizzle({
    client,
    schema,
    casing: "snake_case",
  });
};
