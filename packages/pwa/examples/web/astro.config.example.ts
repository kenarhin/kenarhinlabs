/**
 * Demonstrates the reviewed Astro 7 integration path.
 *
 * The current @vite-pwa/astro release does not declare Astro 7 support, so
 * this example composes the core Vite plugin through Astro's Vite config.
 * The consuming app must still inspect its generated worker and manifest.
 */
import { createPublicPwaOptions } from '@labs/pwa/config'
import { defineConfig } from 'astro/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  vite: {
    plugins: [
      VitePWA(
        createPublicPwaOptions({
          siteUrl: 'https://kenarhinlabs.com',
          apiBaseUrl: 'https://api.kenarhinlabs.com',
          publicMediaOrigins: ['https://media.kenarhinlabs.com'],
        }),
      ),
    ],
  },
})
