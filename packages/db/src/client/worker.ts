import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../schema/index.js";

export interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Creates a request-scoped Drizzle client over a Cloudflare Hyperdrive binding.
 * Call `close()` from a finally block so node-postgres releases its request resources.
 */
export function createWorkerDatabase(binding: HyperdriveBinding) {
  const pool = new Pool({
    connectionString: binding.connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });

  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}

export type WorkerDatabase = ReturnType<typeof createWorkerDatabase>["db"];
