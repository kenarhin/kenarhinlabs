import { createAdminPwaOptions } from '@labs/pwa/config'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA(
      createAdminPwaOptions({
        siteUrl: 'https://admin.kenarhinlabs.com',
        apiBaseUrl: 'https://api.kenarhinlabs.com',
        supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
      }),
    ),
  ],
})
