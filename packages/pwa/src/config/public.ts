import type { PublicPwaConfig, PwaPluginOptions, RuntimeCachingRule } from '../types'
import { createPublicCacheNames } from './cache-names'
import { createPublicManifest } from './manifest'
import { matchSameOriginFont, matchSameOriginImage, matchSameOriginNavigation } from './runtime-matchers'
import { createSharedPluginOptions, createSharedWorkboxOptions, validateSharedPwaConfig } from './shared'
import { createOriginsPattern, createSameOriginPathsPattern, normalizeOrigin } from './url-patterns'

const DAY = 24 * 60 * 60

export function createPublicPwaOptions(config: PublicPwaConfig): PwaPluginOptions {
  const { scope, startUrl, offlineFallbackUrl } = validateSharedPwaConfig({
    ...config,
    startUrl: config.startUrl ?? '/',
  })
  const cacheNames = createPublicCacheNames()
  const runtimeCaching: RuntimeCachingRule[] = []

  const siteOrigin = normalizeOrigin(config.siteUrl, 'siteUrl')
  const networkOnlyOrigins = [
    ...(config.apiBaseUrl ? [config.apiBaseUrl] : []),
    ...(config.networkOnlyOrigins ?? []),
  ]
  const originsPattern = createOriginsPattern(networkOnlyOrigins)
  if (originsPattern) {
    runtimeCaching.push({
      urlPattern: originsPattern,
      method: 'GET',
      handler: 'NetworkOnly',
    })
  }

  const networkOnlyPathPattern = createSameOriginPathsPattern(
    config.siteUrl,
    config.networkOnlyPathPrefixes ?? ['/api', '/auth', '/preview', '/.well-known'],
  )
  if (networkOnlyPathPattern) {
    runtimeCaching.push({
      urlPattern: networkOnlyPathPattern,
      method: 'GET',
      handler: 'NetworkOnly',
    })
  }

  runtimeCaching.push(...(config.advanced?.additionalRuntimeCaching ?? []))

  runtimeCaching.push({
    urlPattern: matchSameOriginNavigation,
    method: 'GET',
    handler: 'NetworkFirst',
    options: {
      cacheName: cacheNames.pages,
      networkTimeoutSeconds: config.navigationNetworkTimeoutSeconds ?? 4,
      cacheableResponse: { statuses: [0, 200] },
      expiration: {
        maxEntries: config.pageCacheMaxEntries ?? 40,
        maxAgeSeconds: config.pageCacheMaxAgeSeconds ?? 7 * DAY,
        purgeOnQuotaError: true,
      },
      precacheFallback: {
        fallbackURL: offlineFallbackUrl,
      },
    },
  })

  runtimeCaching.push({
    urlPattern: matchSameOriginImage,
    method: 'GET',
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: cacheNames.media,
      cacheableResponse: { statuses: [0, 200] },
      expiration: {
        maxEntries: config.mediaCacheMaxEntries ?? 120,
        maxAgeSeconds: config.mediaCacheMaxAgeSeconds ?? 30 * DAY,
        purgeOnQuotaError: true,
      },
    },
  })

  const externalMediaOrigins = (config.publicMediaOrigins ?? []).filter(
    (origin) => normalizeOrigin(origin) !== siteOrigin,
  )
  const mediaOriginsPattern = createOriginsPattern(externalMediaOrigins)
  if (mediaOriginsPattern) {
    runtimeCaching.push({
      urlPattern: mediaOriginsPattern,
      method: 'GET',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: cacheNames.media,
        cacheableResponse: { statuses: [0, 200] },
        expiration: {
          maxEntries: config.mediaCacheMaxEntries ?? 120,
          maxAgeSeconds: config.mediaCacheMaxAgeSeconds ?? 30 * DAY,
          purgeOnQuotaError: true,
        },
      },
    })
  }

  runtimeCaching.push({
    urlPattern: matchSameOriginFont,
    method: 'GET',
    handler: 'CacheFirst',
    options: {
      cacheName: cacheNames.fonts,
      cacheableResponse: { statuses: [0, 200] },
      expiration: {
        maxEntries: config.fontCacheMaxEntries ?? 16,
        maxAgeSeconds: config.fontCacheMaxAgeSeconds ?? 365 * DAY,
        purgeOnQuotaError: true,
      },
    },
  })

  const shared = createSharedPluginOptions(config)
  return {
    ...shared,
    scope,
    manifest: createPublicManifest({
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
      ...createSharedWorkboxOptions(config, 'ken-arhin-labs-web'),
      runtimeCaching,
    },
  }
}
