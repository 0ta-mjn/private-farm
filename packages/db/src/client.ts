import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema.js";
import postgres from "postgres";

export const dbClient = (url: string) => {
  const client = postgres(url);

  return drizzle({
    client,
    schema,
    casing: "snake_case",
  });
};
