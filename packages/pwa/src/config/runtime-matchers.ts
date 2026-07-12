import type { WorkboxRouteContext } from '../types'

/**
 * These functions intentionally have no captured variables. Workbox serializes
 * route callbacks into the generated service worker, so closures would break.
 */
export function matchSameOriginNavigation({ request, url }: WorkboxRouteContext): boolean {
  return request.mode === 'navigate' && url.origin === location.origin
}

export function matchSameOriginImage({ request, url }: WorkboxRouteContext): boolean {
  return request.destination === 'image' && url.origin === location.origin
}

export function matchSameOriginFont({ request, url }: WorkboxRouteContext): boolean {
  return request.destination === 'font' && url.origin === location.origin
}
