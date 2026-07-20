import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSW } from "workbox-build";

/**
 * Strips deprecated legacy_env field from adapter-generated wrangler.json files
 * so Wrangler 4.112+ deploys smoothly without throwing configuration errors.
 *
 * @param {string} clientDirectory Client output path.
 * @param {import("astro").AstroIntegrationLogger} logger Astro logger.
 */
async function cleanGeneratedWranglerConfigs(clientDirectory, logger) {
  const serverDirectory = path.resolve(clientDirectory, "../server");
  const candidates = [
    path.join(serverDirectory, "wrangler.json"),
    path.join(serverDirectory, ".prerender", "wrangler.json"),
  ];

  for (const configFile of candidates) {
    try {
      const raw = await fs.readFile(configFile, "utf-8");
      const data = JSON.parse(raw);
      if ("legacy_env" in data) {
        delete data.legacy_env;
        await fs.writeFile(configFile, JSON.stringify(data, null, 2), "utf-8");
        logger.info(`Cleaned deprecated legacy_env from ${path.basename(configFile)}`);
      }
    } catch {
      // Configuration file does not exist in this target directory; skip.
    }
  }
}

/**
 * Generates the public service worker after Astro has finished its SSR build.
 *
 * Astro 7 uses Vite's Environment API, while vite-plugin-pwa's closeBundle
 * hook skips SSR builds. The Vite plugin still owns the manifest and virtual
 * registration module; this integration completes the generated-worker step
 * against Cloudflare's final client directory.
 *
 * @param {Partial<import("vite-plugin-pwa").VitePWAOptions>} options Shared
 * manifest and Workbox policy produced by @labs/pwa.
 * @returns {import("astro").AstroIntegration} An Astro build integration.
 */
export function createPublicPwaBuildIntegration(options) {
  return {
    name: "@labs/web-public-pwa-build",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const manifestPath = `/${options.manifestFilename ?? "manifest.webmanifest"}`;
        const manifest = JSON.stringify(options.manifest ?? {});

        // The PWA plugin intentionally leaves its development worker disabled.
        // Serve only the manifest so local page diagnostics match production
        // without letting a development service worker cache Vite resources.
        server.middlewares.use((request, response, next) => {
          if (request.url?.split("?", 1)[0] !== manifestPath) {
            next();
            return;
          }

          response.statusCode = 200;
          response.setHeader(
            "Content-Type",
            "application/manifest+json; charset=utf-8",
          );
          response.end(manifest);
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        // For an SSR adapter Astro passes the finalized client output URL here.
        const clientDirectory = fileURLToPath(dir);
        const serviceWorkerPath = fileURLToPath(new URL("./sw.js", dir));
        const includeAssets = options.includeAssets ?? [];
        const workbox = options.workbox ?? {};

        await cleanGeneratedWranglerConfigs(clientDirectory, logger);

        const result = await generateSW({
          ...workbox,
          globDirectory: clientDirectory,
          globPatterns: [...(workbox.globPatterns ?? []), ...includeAssets],
          swDest: serviceWorkerPath,
        });

        if (result.count === 0) {
          throw new Error(
            "The public service worker generated without any precached files.",
          );
        }

        logger.info(
          `Generated sw.js with ${result.count} precached files (${result.size} bytes).`,
        );
        for (const warning of result.warnings) logger.warn(warning);
      },
    },
  };
}
