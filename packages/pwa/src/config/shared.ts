import type { PwaPluginOptions, SharedPwaConfig, WorkboxOptions } from '../types'
import { DEFAULT_IGNORE_URL_PARAMETERS, DEFAULT_PWA_INCLUDE_ASSETS } from '../constants'
import { isWithinScope, normalizeAppPath, normalizeHttpUrl } from './url-patterns'

export function validateSharedPwaConfig(config: SharedPwaConfig): {
  scope: string
  startUrl: string
  offlineFallbackUrl: string
} {
  normalizeHttpUrl(config.siteUrl, 'siteUrl')

  const scope = normalizeAppPath(config.scope, '/')
  const startUrl = normalizeAppPath(config.startUrl, '/')
  const offlineFallbackUrl = normalizeAppPath(config.offlineFallbackUrl, '/offline.html')

  const startPath = new URL(startUrl, config.siteUrl).pathname
  if (!isWithinScope(startPath, scope)) {
    throw new TypeError(`startUrl (${startUrl}) must be inside the manifest scope (${scope})`)
  }

  return { scope, startUrl, offlineFallbackUrl }
}

export function createSharedWorkboxOptions(
  config: SharedPwaConfig,
  cacheId: string,
): Partial<WorkboxOptions> {
  return {
    cacheId,
    globPatterns: ['**/*.{js,css,woff,woff2}'],
    cleanupOutdatedCaches: true,
    clientsClaim: false,
    skipWaiting: false,
    navigationPreload: true,
    // Disable Vite PWA's SPA-style index.html NavigationRoute. Both Ken Arhin Labs apps
    // define explicit navigation policies below.
    navigateFallback: null,
    offlineGoogleAnalytics: false,
    ignoreURLParametersMatching: [...DEFAULT_IGNORE_URL_PARAMETERS],
    dontCacheBustURLsMatching: /-[a-f0-9]{8,}\./,
    maximumFileSizeToCacheInBytes: config.maximumFileSizeToCacheInBytes ?? 3 * 1024 * 1024,
    ...config.advanced?.workbox,
  }
}

export function createSharedPluginOptions(config: SharedPwaConfig): PwaPluginOptions {
  return {
    strategies: 'generateSW',
    registerType: 'prompt',
    injectRegister: null,
    manifestFilename: 'manifest.webmanifest',
    includeManifestIcons: true,
    includeAssets: config.includeAssets ?? [...DEFAULT_PWA_INCLUDE_ASSETS],
    disable: config.disabled ?? false,
    devOptions: {
      enabled: config.devEnabled ?? false,
    },
    ...config.advanced?.plugin,
  }
}
