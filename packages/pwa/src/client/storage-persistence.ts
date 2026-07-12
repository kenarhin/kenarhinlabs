export type PersistenceResult = 'granted' | 'denied' | 'unsupported'

export interface StorageEstimateSnapshot {
  usage?: number
  quota?: number
  usageRatio?: number
}

export async function requestPersistentStorage(): Promise<PersistenceResult> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported'
  }

  try {
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export async function getStorageEstimate(): Promise<StorageEstimateSnapshot> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return {}

  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage
    const quota = estimate.quota
    return {
      usage,
      quota,
      usageRatio: usage !== undefined && quota ? usage / quota : undefined,
    }
  } catch {
    return {}
  }
}
