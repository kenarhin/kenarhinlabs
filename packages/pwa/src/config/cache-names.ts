import { PWA_CACHE_SCHEMA_VERSION } from '../constants'

export interface PublicCacheNames {
  pages: string
  media: string
  fonts: string
}

export interface AdminCacheNames {
  safeAssets: string
}

export function createPublicCacheNames(namespace = 'kal-web'): PublicCacheNames {
  return {
    pages: `${namespace}-pages-${PWA_CACHE_SCHEMA_VERSION}`,
    media: `${namespace}-media-${PWA_CACHE_SCHEMA_VERSION}`,
    fonts: `${namespace}-fonts-${PWA_CACHE_SCHEMA_VERSION}`,
  }
}

export function createAdminCacheNames(namespace = 'kal-admin'): AdminCacheNames {
  return {
    safeAssets: `${namespace}-safe-assets-${PWA_CACHE_SCHEMA_VERSION}`,
  }
}
