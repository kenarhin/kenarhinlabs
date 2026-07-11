import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/** Runs API tests inside workerd so Web Crypto and bindings match production. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      // Unit-level route tests inject persistence/platform ports explicitly.
      // A test-only Wrangler config therefore avoids pretending that an
      // unreachable Postgres URL is a valid Hyperdrive integration test.
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
