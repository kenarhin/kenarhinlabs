import { defineConfig } from "drizzle-kit";

/** Configures offline SQL generation for the D1 public projection schema. */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/d1-schema/index.ts",
  out: "./drizzle/d1",
  strict: true,
  verbose: true,
});
