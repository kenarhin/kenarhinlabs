import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "../schema/index.js";

export interface NodeDatabaseOptions {
  connectionString: string;
  pool?: Omit<PoolConfig, "connectionString">;
}

/**
 * Creates the Node.js database client used by local tools and long-lived processes.
 * The caller owns the returned pool and must call `pool.end()` during shutdown.
 */
export function createNodeDatabase(options: NodeDatabaseOptions) {
  const pool = new Pool({ connectionString: options.connectionString, ...options.pool });
  return { db: drizzle(pool, { schema }), pool };
}

export type NodeDatabase = ReturnType<typeof createNodeDatabase>["db"];
