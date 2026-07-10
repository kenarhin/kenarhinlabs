import cloudflare from "@astrojs/cloudflare";

// @ts-check
import { defineConfig } from "astro/config";
// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
});