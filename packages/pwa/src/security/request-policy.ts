export interface RequestPolicy {
  sensitiveOrigins?: string[]
  sensitivePathPrefixes?: string[]
  sensitiveHeaders?: string[]
}

export interface RequestClassification {
  cacheable: boolean
  reason:
    | 'safe-get'
    | 'non-get'
    | 'sensitive-origin'
    | 'sensitive-path'
    | 'sensitive-header'
    | 'invalid-url'
}

const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-csrf-token',
  'x-supabase-auth',
]

function normalizeOrigin(value: string): string | undefined {
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

function getRequestParts(input: Request | string): {
  url: URL | undefined
  method: string
  headers: Headers
} {
  if (typeof input === 'string') {
    try {
      return { url: new URL(input), method: 'GET', headers: new Headers() }
    } catch {
      return { url: undefined, method: 'GET', headers: new Headers() }
    }
  }

  try {
    return { url: new URL(input.url), method: input.method, headers: input.headers }
  } catch {
    return { url: undefined, method: input.method, headers: input.headers }
  }
}

export function classifyRequest(
  input: Request | string,
  policy: RequestPolicy = {},
): RequestClassification {
  const { url, method, headers } = getRequestParts(input)
  if (!url) return { cacheable: false, reason: 'invalid-url' }
  if (method.toUpperCase() !== 'GET') return { cacheable: false, reason: 'non-get' }

  const sensitiveOrigins = new Set(
    (policy.sensitiveOrigins ?? [])
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  )
  if (sensitiveOrigins.has(url.origin)) return { cacheable: false, reason: 'sensitive-origin' }

  const hasSensitivePath = (policy.sensitivePathPrefixes ?? []).some((prefix) => {
    const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`
    return url.pathname === normalized || url.pathname.startsWith(`${normalized.replace(/\/$/, '')}/`)
  })
  if (hasSensitivePath) return { cacheable: false, reason: 'sensitive-path' }

  const sensitiveHeaders = new Set([
    ...DEFAULT_SENSITIVE_HEADERS,
    ...(policy.sensitiveHeaders ?? []).map((header) => header.toLowerCase()),
  ])
  for (const header of sensitiveHeaders) {
    if (headers.has(header)) return { cacheable: false, reason: 'sensitive-header' }
  }

  return { cacheable: true, reason: 'safe-get' }
}

export function isResponseSafeToCache(response: Response): boolean {
  if (!response.ok) return false
  if (response.type === 'opaque') return false
  if (response.headers.has('set-cookie')) return false

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? ''
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false

  return true
}
