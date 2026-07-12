export const PWA_PACKAGE_VERSION = '0.1.0' as const
export const PWA_CACHE_SCHEMA_VERSION = 'v1' as const

export const KEN_ARHIN_LABS_PWA_COLORS = {
  labInk: '#11130F',
  warmCanvas: '#F3F0E8',
  cleanPaper: '#FFFDF7',
  signalOrange: '#FF5A1F',
  systemBlue: '#2D5BFF',
  fieldGreen: '#4A6B47',
} as const

export const DEFAULT_PWA_ICONS = [
  {
    src: '/pwa-64x64.png',
    sizes: '64x64',
    type: 'image/png',
  },
  {
    src: '/pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
  },
  {
    src: '/pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/maskable-icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
] as const

export const DEFAULT_PWA_INCLUDE_ASSETS = [
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon-180x180.png',
  'pwa-64x64.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png',
  'offline.html',
] as const

export const DEFAULT_IGNORE_URL_PARAMETERS = [
  /^utm_/,
  /^fbclid$/,
  /^gclid$/,
  /^mc_cid$/,
  /^mc_eid$/,
] as const

export const PWA_STORAGE = {
  databaseName: 'ken-arhin-labs-pwa',
  databaseVersion: 1,
  draftsStore: 'drafts',
  retryQueueStore: 'retry_queue',
  metadataStore: 'metadata',
} as const

export const PWA_STORAGE_DEFAULTS = {
  draftTtlMs: 30 * 24 * 60 * 60 * 1000,
  draftMaxEntriesPerOwner: 50,
  retryTtlMs: 7 * 24 * 60 * 60 * 1000,
  retryLeaseMs: 60 * 1000,
  retryMaxAttempts: 5,
  retryBaseDelayMs: 5 * 1000,
  retryMaxDelayMs: 30 * 60 * 1000,
} as const
