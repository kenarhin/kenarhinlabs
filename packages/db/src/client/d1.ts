import { drizzle } from "drizzle-orm/d1";

import * as schema from "../d1-schema/index.js";

/** Creates the typed public read-model client from a D1 Worker binding. */
export function createD1Database(binding: D1Database) {
  return drizzle(binding, { schema });
}

export type D1DatabaseClient = ReturnType<typeof createD1Database>;
