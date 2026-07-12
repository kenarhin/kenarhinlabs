function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePrefix(prefix: string): string {
  if (!prefix) return '/'
  return prefix.startsWith('/') ? prefix : `/${prefix}`
}

export function normalizeHttpUrl(value: string, label = 'URL'): URL {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new TypeError(`${label} must be a valid absolute URL: ${value}`)
  }

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(isLocalhost && url.protocol === 'http:')) {
    throw new TypeError(`${label} must use HTTPS, except for localhost development: ${value}`)
  }

  return url
}

export function normalizeOrigin(value: string, label = 'URL'): string {
  return normalizeHttpUrl(value, label).origin
}

export function createOriginsPattern(origins: readonly string[]): RegExp | undefined {
  const uniqueOrigins = [...new Set(origins.filter(Boolean).map((origin) => normalizeOrigin(origin)))]
  if (uniqueOrigins.length === 0) return undefined

  const alternatives = uniqueOrigins.map(escapeRegExp).join('|')
  return new RegExp(`^(?:${alternatives})(?:/|$)`)
}

export function createSameOriginPathsPattern(
  siteUrl: string,
  pathPrefixes: readonly string[],
): RegExp | undefined {
  const origin = normalizeOrigin(siteUrl, 'siteUrl')
  const uniquePrefixes = [...new Set(pathPrefixes.filter(Boolean).map(normalizePrefix))]
  if (uniquePrefixes.length === 0) return undefined

  const alternatives = uniquePrefixes.map((prefix) => {
    if (prefix === '/') return `${escapeRegExp(origin)}/`
    return `${escapeRegExp(origin)}${escapeRegExp(prefix)}(?:/|\\?|$)`
  })

  return new RegExp(`^(?:${alternatives.join('|')})`)
}

export function isWithinScope(pathname: string, scope: string): boolean {
  const normalizedScope = normalizePrefix(scope)
  if (normalizedScope === '/') return pathname.startsWith('/')
  return pathname === normalizedScope || pathname.startsWith(`${normalizedScope.replace(/\/$/, '')}/`)
}

export function normalizeAppPath(value: string | undefined, fallback: string): string {
  const path = value ?? fallback
  if (!path.startsWith('/')) {
    throw new TypeError(`PWA paths must be root-relative and start with "/": ${path}`)
  }
  return path
}
