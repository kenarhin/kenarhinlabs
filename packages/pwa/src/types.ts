import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa'

export type PwaPluginOptions = Partial<VitePWAOptions>
export type PwaManifestOptions = Partial<ManifestOptions>
export type WorkboxOptions = NonNullable<VitePWAOptions['workbox']>
export type RuntimeCachingRule = NonNullable<WorkboxOptions['runtimeCaching']>[number]

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface PwaAdvancedOptions {
  /**
   * Additional runtime rules are appended after the package's security-critical
   * NetworkOnly rules and before the broad navigation/media rules where possible.
   */
  additionalRuntimeCaching?: RuntimeCachingRule[]
  /**
   * Workbox overrides excluding runtimeCaching. The package owns route order.
   */
  workbox?: Omit<
    Partial<WorkboxOptions>,
    'runtimeCaching' | 'navigateFallback' | 'skipWaiting' | 'clientsClaim' | 'cacheId'
  >
  /**
   * Manifest overrides. Arrays replace defaults rather than being concatenated.
   */
  manifest?: PwaManifestOptions
  /**
   * Top-level plugin overrides that cannot replace the package's manifest,
   * Workbox policy, service-worker strategy, registration behavior, or assets.
   */
  plugin?: Omit<
    PwaPluginOptions,
    | 'manifest'
    | 'workbox'
    | 'strategies'
    | 'registerType'
    | 'injectRegister'
    | 'includeAssets'
    | 'includeManifestIcons'
  >
}

export interface SharedPwaConfig {
  siteUrl: string
  name?: string
  shortName?: string
  description?: string
  appId?: string
  startUrl?: string
  scope?: string
  lang?: string
  themeColor?: string
  backgroundColor?: string
  offlineFallbackUrl?: string
  includeAssets?: string[]
  maximumFileSizeToCacheInBytes?: number
  devEnabled?: boolean
  disabled?: boolean
  advanced?: PwaAdvancedOptions
}

export interface PublicPwaConfig extends SharedPwaConfig {
  apiBaseUrl?: string
  publicMediaOrigins?: string[]
  networkOnlyOrigins?: string[]
  networkOnlyPathPrefixes?: string[]
  pageCacheMaxEntries?: number
  pageCacheMaxAgeSeconds?: number
  mediaCacheMaxEntries?: number
  mediaCacheMaxAgeSeconds?: number
  fontCacheMaxEntries?: number
  fontCacheMaxAgeSeconds?: number
  navigationNetworkTimeoutSeconds?: number
}

export interface AdminPwaConfig extends SharedPwaConfig {
  apiBaseUrl: string
  supabaseUrl: string
  sensitiveOrigins?: string[]
  sensitivePathPrefixes?: string[]
  safeAssetOrigins?: string[]
  safeAssetCacheMaxEntries?: number
  safeAssetCacheMaxAgeSeconds?: number
}

export interface WorkboxRouteContext {
  request: Request
  url: URL
}
