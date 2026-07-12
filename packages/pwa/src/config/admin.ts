import type { AdminPwaConfig, PwaPluginOptions, RuntimeCachingRule } from '../types'
import { createAdminCacheNames } from './cache-names'
import { createAdminManifest } from './manifest'
import { matchSameOriginNavigation } from './runtime-matchers'
import { createSharedPluginOptions, createSharedWorkboxOptions, validateSharedPwaConfig } from './shared'
import { createOriginsPattern, createSameOriginPathsPattern } from './url-patterns'

const DAY = 24 * 60 * 60

export function createAdminPwaOptions(config: AdminPwaConfig): PwaPluginOptions {
  const { scope, startUrl, offlineFallbackUrl } = validateSharedPwaConfig({
    ...config,
    startUrl: config.startUrl ?? '/dashboard',
  })
  const cacheNames = createAdminCacheNames()
  const runtimeCaching: RuntimeCachingRule[] = []

  const sensitiveOriginsPattern = createOriginsPattern([
    config.apiBaseUrl,
    config.supabaseUrl,
    ...(config.sensitiveOrigins ?? []),
  ])
  if (sensitiveOriginsPattern) {
    runtimeCaching.push({
      urlPattern: sensitiveOriginsPattern,
      method: 'GET',
      handler: 'NetworkOnly',
    })
  }

  const sensitivePathsPattern = createSameOriginPathsPattern(
    config.siteUrl,
    config.sensitivePathPrefixes ?? [
      '/api',
      '/_server',
      '/__server',
      '/_tanstack',
      '/auth/callback',
    ],
  )
  if (sensitivePathsPattern) {
    runtimeCaching.push({
      urlPattern: sensitivePathsPattern,
      method: 'GET',
      handler: 'NetworkOnly',
    })
  }

  runtimeCaching.push(...(config.advanced?.additionalRuntimeCaching ?? []))

  runtimeCaching.push({
    urlPattern: matchSameOriginNavigation,
    method: 'GET',
    handler: 'NetworkOnly',
    options: {
      precacheFallback: {
        fallbackURL: offlineFallbackUrl,
      },
    },
  })

  const safeAssetOriginsPattern = createOriginsPattern(config.safeAssetOrigins ?? [])
  if (safeAssetOriginsPattern) {
    runtimeCaching.push({
      urlPattern: safeAssetOriginsPattern,
      method: 'GET',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: cacheNames.safeAssets,
        cacheableResponse: { statuses: [0, 200] },
        expiration: {
          maxEntries: config.safeAssetCacheMaxEntries ?? 40,
          maxAgeSeconds: config.safeAssetCacheMaxAgeSeconds ?? 30 * DAY,
          purgeOnQuotaError: true,
        },
      },
    })
  }

  const shared = createSharedPluginOptions(config)
  return {
    ...shared,
    scope,
    manifest: createAdminManifest({
      name: config.name,
      shortName: config.shortName,
      description: config.description,
      appId: config.appId,
      startUrl,
      scope,
      lang: config.lang,
      themeColor: config.themeColor,
      backgroundColor: config.backgroundColor,
      overrides: config.advanced?.manifest,
    }),
    workbox: {
      ...createSharedWorkboxOptions(config, 'ken-arhin-labs-admin'),
      runtimeCaching,
    },
  }
}
