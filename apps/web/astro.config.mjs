/**
 * Astro configuration for apps/web (public site).
 *
 * Adapter: @astrojs/cloudflare — targets Cloudflare Workers (not Pages).
 * Tailwind v4: loaded via the @tailwindcss/vite Vite plugin (CSS-first,
 * no tailwind.config.js). The plugin is registered under vite.plugins, not
 * integrations[], which is the correct approach for Tailwind v4.
 *
 * output: 'server' enables on-demand SSR for dynamic routes (API-fed pages).
 * Individual static pages (e.g. privacy) opt in via `export const prerender = true`.
 */

// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  /** Full SSR — served from Cloudflare Workers. */
  output: "server",

  adapter: cloudflare(),

  vite: {
    plugins: [
      /**
       * Tailwind CSS v4 Vite plugin.
       * CSS-first configuration: all theme tokens live in
       * src/styles/global.css via @labs/design, not in a config file.
       */
      tailwindcss(),
    ],
  },
});