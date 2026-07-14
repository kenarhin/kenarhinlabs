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
import { createPublicPwaOptions } from "@labs/pwa/config";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { VitePWA } from "vite-plugin-pwa";
import { createPublicPwaBuildIntegration } from "./integrations/public-pwa.mjs";

const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://kenarhinlabs.com";
const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "https://api.kenarhinlabs.com";
const publicPwaOptions = createPublicPwaOptions({
  siteUrl,
  apiBaseUrl,
  name: "Ken Arhin Labs",
  shortName: "KAL Labs",
  description: "Digital systems, built around people.",
  includeAssets: [
    "favicon.ico",
    "favicon.svg",
    "favicon-48.png",
    "apple-touch-icon.png",
    "icons/pwa-192.png",
    "icons/pwa-512.png",
    "icons/pwa-maskable-192.png",
    "icons/pwa-maskable-512.png",
    "offline.html",
  ],
  advanced: {
    manifest: {
      icons: [
        {
          src: "/icons/pwa-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/pwa-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/pwa-maskable-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/pwa-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Start a project",
          short_name: "Start",
          description: "Begin a project request with Ken Arhin Labs.",
          url: "/start-a-project",
        },
        {
          name: "Explore capabilities",
          short_name: "Capabilities",
          description: "Review the systems Ken Arhin Labs designs and builds.",
          url: "/#capabilities",
        },
      ],
    },
  },
});

export default defineConfig({
  site: siteUrl,

  /** Full SSR — served from Cloudflare Workers. */
  output: "server",

  adapter: cloudflare(),

  integrations: [createPublicPwaBuildIntegration(publicPwaOptions)],

  vite: {
    plugins: [
      /**
       * Tailwind CSS v4 Vite plugin.
       * CSS-first configuration: all theme tokens live in
       * src/styles/global.css via @labs/design, not in a config file.
       */
      tailwindcss(),
      /**
       * Astro 7 integration through Vite's plugin surface.
       *
       * @vite-pwa/astro@1.2.0 does not declare Astro 7 support. The core
       * plugin path keeps that incompatibility out of the dependency graph
       * and is verified by inspecting the generated worker and manifest.
       */
      VitePWA(publicPwaOptions),
    ],
  },
});
