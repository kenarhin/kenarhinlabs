import type { JsonValue } from '../types'
import { PWA_STORAGE, PWA_STORAGE_DEFAULTS } from '../constants'
import { requestToPromise, withStore } from './indexed-db'

export interface DraftRecord<TPayload extends JsonValue = JsonValue> {
  key: string
  ownerId: string
  kind: string
  entityId?: string
  schemaVersion: number
  payload: TPayload
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface SaveDraftInput<TPayload extends JsonValue> {
  key: string
  ownerId: string
  kind: string
  entityId?: string
  schemaVersion?: number
  payload: TPayload
  ttlMs?: number
}

export interface DraftStoreOptions {
  databaseName?: string
  defaultTtlMs?: number
  maxEntriesPerOwner?: number
}

function assertRequired(value: string, label: string): void {
  if (!value.trim()) throw new TypeError(`${label} is required`)
}

function isExpired(record: DraftRecord, now = Date.now()): boolean {
  return new Date(record.expiresAt).getTime() <= now
}

export class DraftStore<TPayload extends JsonValue = JsonValue> {
  readonly #databaseName: string
  readonly #defaultTtlMs: number
  readonly #maxEntriesPerOwner: number

  constructor(options: DraftStoreOptions = {}) {
    this.#databaseName = options.databaseName ?? PWA_STORAGE.databaseName
    this.#defaultTtlMs = options.defaultTtlMs ?? PWA_STORAGE_DEFAULTS.draftTtlMs
    this.#maxEntriesPerOwner =
      options.maxEntriesPerOwner ?? PWA_STORAGE_DEFAULTS.draftMaxEntriesPerOwner
  }

  async save(input: SaveDraftInput<TPayload>): Promise<DraftRecord<TPayload>> {
    assertRequired(input.key, 'Draft key')
    assertRequired(input.ownerId, 'Draft ownerId')
    assertRequired(input.kind, 'Draft kind')

    const now = new Date()
    const existing = await this.get(input.key, input.ownerId, { includeExpired: true })
    const record: DraftRecord<TPayload> = {
      key: input.key,
      ownerId: input.ownerId,
      kind: input.kind,
      entityId: input.entityId,
      schemaVersion: input.schemaVersion ?? 1,
      payload: input.payload,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? this.#defaultTtlMs)).toISOString(),
    }

    await withStore<void>(
      PWA_STORAGE.draftsStore,
      'readwrite',
      async (store) => {
        await requestToPromise(store.put(record))
      },
      this.#databaseName,
    )

    await this.pruneExpired()
    await this.#enforceOwnerLimit(input.ownerId)
    return record
  }

  async get(
    key: string,
    ownerId: string,
    options: { includeExpired?: boolean } = {},
  ): Promise<DraftRecord<TPayload> | undefined> {
    const record = await withStore<DraftRecord<TPayload> | undefined>(
      PWA_STORAGE.draftsStore,
      'readonly',
      async (store) =>
        (await requestToPromise(store.get([ownerId, key]))) as DraftRecord<TPayload> | undefined,
      this.#databaseName,
    )

    if (!record || record.ownerId !== ownerId) return undefined
    if (!options.includeExpired && isExpired(record)) {
      await this.delete(key, ownerId)
      return undefined
    }
    return record
  }

  async list(ownerId: string, kind?: string): Promise<DraftRecord<TPayload>[]> {
    const records = await withStore<DraftRecord<TPayload>[]>(
      PWA_STORAGE.draftsStore,
      'readonly',
      async (store) => {
        const index = store.index('ownerId')
        return (await requestToPromise(index.getAll(ownerId))) as DraftRecord<TPayload>[]
      },
      this.#databaseName,
    )

    const now = Date.now()
    const active = records.filter((record) => !isExpired(record, now) && (!kind || record.kind === kind))
    return active.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async delete(key: string, ownerId: string): Promise<boolean> {
    const record = await this.get(key, ownerId, { includeExpired: true })
    if (!record) return false

    await withStore<void>(
      PWA_STORAGE.draftsStore,
      'readwrite',
      async (store) => {
        await requestToPromise(store.delete([ownerId, key]))
      },
      this.#databaseName,
    )
    return true
  }

  async clearOwner(ownerId: string): Promise<number> {
    return withStore<number>(
      PWA_STORAGE.draftsStore,
      'readwrite',
      async (store) => {
        const records = (await requestToPromise(
          store.index('ownerId').getAll(ownerId),
        )) as DraftRecord<TPayload>[]
        for (const record of records) store.delete([record.ownerId, record.key])
        return records.length
      },
      this.#databaseName,
    )
  }

  async pruneExpired(now = Date.now()): Promise<number> {
    return withStore<number>(
      PWA_STORAGE.draftsStore,
      'readwrite',
      async (store) => {
        const records = (await requestToPromise(store.getAll())) as DraftRecord<TPayload>[]
        const expired = records.filter((record) => isExpired(record, now))
        for (const record of expired) store.delete([record.ownerId, record.key])
        return expired.length
      },
      this.#databaseName,
    )
  }

  async #enforceOwnerLimit(ownerId: string): Promise<void> {
    const records = await this.list(ownerId)
    if (records.length <= this.#maxEntriesPerOwner) return

    const remove = records.slice(this.#maxEntriesPerOwner)
    await withStore<void>(
      PWA_STORAGE.draftsStore,
      'readwrite',
      async (store) => {
        for (const record of remove) store.delete([record.ownerId, record.key])
      },
      this.#databaseName,
    )
  }
}

export function createDraftStore<TPayload extends JsonValue = JsonValue>(
  options?: DraftStoreOptions,
): DraftStore<TPayload> {
  return new DraftStore<TPayload>(options)
}
