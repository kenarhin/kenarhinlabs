import { PWA_STORAGE } from '../constants'

export type PwaStoreName =
  | typeof PWA_STORAGE.draftsStore
  | typeof PWA_STORAGE.retryQueueStore
  | typeof PWA_STORAGE.metadataStore

const databasePromises = new Map<string, Promise<IDBDatabase>>()

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function createSchema(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(PWA_STORAGE.draftsStore)) {
    const drafts = database.createObjectStore(PWA_STORAGE.draftsStore, { keyPath: ['ownerId', 'key'] })
    drafts.createIndex('ownerId', 'ownerId', { unique: false })
    drafts.createIndex('updatedAt', 'updatedAt', { unique: false })
    drafts.createIndex('kind', 'kind', { unique: false })
    drafts.createIndex('expiresAt', 'expiresAt', { unique: false })
  }

  if (!database.objectStoreNames.contains(PWA_STORAGE.retryQueueStore)) {
    const queue = database.createObjectStore(PWA_STORAGE.retryQueueStore, { keyPath: 'id' })
    queue.createIndex('ownerId', 'ownerId', { unique: false })
    queue.createIndex('status', 'status', { unique: false })
    queue.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false })
    queue.createIndex('createdAt', 'createdAt', { unique: false })
    queue.createIndex('leaseUntil', 'leaseUntil', { unique: false })
    queue.createIndex('expiresAt', 'expiresAt', { unique: false })
  }

  if (!database.objectStoreNames.contains(PWA_STORAGE.metadataStore)) {
    database.createObjectStore(PWA_STORAGE.metadataStore, { keyPath: 'key' })
  }
}

export function openPwaDatabase(databaseName: string = PWA_STORAGE.databaseName): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'))
  }

  const existing = databasePromises.get(databaseName)
  if (existing) return existing

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, PWA_STORAGE.databaseVersion)

    request.onupgradeneeded = () => createSchema(request.result)
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        databasePromises.delete(databaseName)
      }
      resolve(database)
    }
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab'))
  })

  databasePromises.set(databaseName, promise)
  promise.catch(() => databasePromises.delete(databaseName))
  return promise
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export async function withStore<T>(
  storeName: PwaStoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T,
  databaseName: string = PWA_STORAGE.databaseName,
): Promise<T> {
  const database = await openPwaDatabase(databaseName)
  const transaction = database.transaction(storeName, mode)
  const store = transaction.objectStore(storeName)

  const result = await operation(store, transaction)
  await transactionDone(transaction)
  return result
}

export async function deletePwaDatabase(databaseName: string = PWA_STORAGE.databaseName): Promise<void> {
  const existing = databasePromises.get(databaseName)
  if (existing) {
    try {
      ;(await existing).close()
    } catch {
      // Ignore failed opens during cleanup.
    }
    databasePromises.delete(databaseName)
  }

  if (!isIndexedDbAvailable()) return

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Failed to delete IndexedDB database'))
    request.onblocked = () => reject(new Error('IndexedDB deletion is blocked by another tab'))
  })
}
