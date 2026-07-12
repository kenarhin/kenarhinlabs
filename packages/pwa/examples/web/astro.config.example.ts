import AstroPWA from '@vite-pwa/astro'
import { createPublicPwaOptions } from '@labs/pwa/config'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    AstroPWA(
      createPublicPwaOptions({
        siteUrl: 'https://kenarhinlabs.com',
        apiBaseUrl: 'https://api.kenarhinlabs.com',
        publicMediaOrigins: ['https://media.kenarhinlabs.com'],
      }),
    ),
  ],
})
