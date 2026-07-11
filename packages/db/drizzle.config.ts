import "dotenv/config";

import { defineConfig } from "drizzle-kit";

/**
 * Configures Drizzle Kit for the canonical Supabase Postgres schema.
 * DATABASE_URL is intentionally required only when a command connects to a database.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle/postgres",
  dbCredentials: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});
