export type ConnectivityStatus = 'online' | 'offline' | 'unknown'

export interface ConnectivitySnapshot {
  status: ConnectivityStatus
  onlineHint: boolean | null
  effectiveType?: string
  saveData?: boolean
  changedAt: string
}

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string
  saveData?: boolean
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

export function getConnectivitySnapshot(): ConnectivitySnapshot {
  const onlineHint = typeof navigator === 'undefined' ? null : navigator.onLine
  const connection = getConnection()

  return {
    status: onlineHint === null ? 'unknown' : onlineHint ? 'online' : 'offline',
    onlineHint,
    effectiveType: connection?.effectiveType,
    saveData: connection?.saveData,
    changedAt: new Date().toISOString(),
  }
}

export function observeConnectivity(
  listener: (snapshot: ConnectivitySnapshot) => void,
): () => void {
  if (typeof window === 'undefined') {
    listener(getConnectivitySnapshot())
    return () => undefined
  }

  const connection = getConnection()
  const emit = () => listener(getConnectivitySnapshot())

  window.addEventListener('online', emit)
  window.addEventListener('offline', emit)
  connection?.addEventListener('change', emit)
  emit()

  return () => {
    window.removeEventListener('online', emit)
    window.removeEventListener('offline', emit)
    connection?.removeEventListener('change', emit)
  }
}

export interface NetworkProbeOptions {
  url: string
  timeoutMs?: number
  method?: 'HEAD' | 'GET'
  credentials?: RequestCredentials
}

export async function probeNetwork(options: NetworkProbeOptions): Promise<boolean> {
  if (typeof fetch === 'undefined') return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000)

  try {
    const response = await fetch(options.url, {
      method: options.method ?? 'HEAD',
      cache: 'no-store',
      credentials: options.credentials ?? 'omit',
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
      },
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
