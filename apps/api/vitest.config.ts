import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/** Runs API tests inside workerd so Web Crypto and bindings match production. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      // Unit-level route tests inject persistence/platform ports explicitly.
      // A test-only Wrangler config therefore avoids pretending that an
      // unreachable Postgres URL is a valid Hyperdrive integration test.
      // Keep the test config in a directory without local secret files. Wrangler
      // resolves dev-variable discovery beside its config file, so this prevents
      // the test harness from loading the developer's private `.dev.vars`.
      wrangler: { configPath: "./test/wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
