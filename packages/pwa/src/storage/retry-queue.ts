import type { JsonValue } from '../types'
import { PWA_STORAGE, PWA_STORAGE_DEFAULTS } from '../constants'
import { requestToPromise, withStore } from './indexed-db'

export type RetryMode = 'automatic' | 'manual'
export type RetryStatus = 'pending' | 'processing' | 'failed' | 'blocked' | 'dead'

export interface RetryError {
  code: string
  message: string
  retryable: boolean
  httpStatus?: number
}

export interface RetryQueueItem<TPayload extends JsonValue = JsonValue> {
  id: string
  ownerId: string
  operation: string
  mode: RetryMode
  idempotencyKey: string
  payload: TPayload
  status: RetryStatus
  attempts: number
  maxAttempts: number
  createdAt: string
  updatedAt: string
  nextAttemptAt: string
  leaseUntil?: string
  expiresAt: string
  lastError?: RetryError
}

export interface EnqueueRetryInput<TPayload extends JsonValue> {
  ownerId: string
  operation: string
  payload: TPayload
  mode?: RetryMode
  idempotencyKey?: string
  maxAttempts?: number
  ttlMs?: number
}

export interface RetryQueueOptions {
  databaseName?: string
  defaultTtlMs?: number
  leaseMs?: number
  defaultMaxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  random?: () => number
}

export interface ClaimRetryOptions {
  ownerId: string
  limit?: number
  includeManual?: boolean
  now?: number
}

export interface ProcessRetryQueueOptions<TPayload extends JsonValue> {
  ownerId: string
  limit?: number
  execute(item: RetryQueueItem<TPayload>): Promise<void>
  normalizeError?(error: unknown, item: RetryQueueItem<TPayload>): RetryError
}

export interface RetryProcessSummary {
  claimed: number
  succeeded: number
  failed: number
  blocked: number
  dead: number
}

function required(value: string, label: string): void {
  if (!value.trim()) throw new TypeError(`${label} is required`)
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `pwa-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultNormalizeError(error: unknown): RetryError {
  if (error instanceof Error) {
    return {
      code: 'RETRY_EXECUTION_FAILED',
      message: error.message,
      retryable: true,
    }
  }

  return {
    code: 'RETRY_EXECUTION_FAILED',
    message: 'The queued operation failed.',
    retryable: true,
  }
}

function isExpired(item: RetryQueueItem, now: number): boolean {
  return new Date(item.expiresAt).getTime() <= now
}

export class RetryQueue<TPayload extends JsonValue = JsonValue> {
  readonly #databaseName: string
  readonly #defaultTtlMs: number
  readonly #leaseMs: number
  readonly #defaultMaxAttempts: number
  readonly #baseDelayMs: number
  readonly #maxDelayMs: number
  readonly #random: () => number

  constructor(options: RetryQueueOptions = {}) {
    this.#databaseName = options.databaseName ?? PWA_STORAGE.databaseName
    this.#defaultTtlMs = options.defaultTtlMs ?? PWA_STORAGE_DEFAULTS.retryTtlMs
    this.#leaseMs = options.leaseMs ?? PWA_STORAGE_DEFAULTS.retryLeaseMs
    this.#defaultMaxAttempts =
      options.defaultMaxAttempts ?? PWA_STORAGE_DEFAULTS.retryMaxAttempts
    this.#baseDelayMs = options.baseDelayMs ?? PWA_STORAGE_DEFAULTS.retryBaseDelayMs
    this.#maxDelayMs = options.maxDelayMs ?? PWA_STORAGE_DEFAULTS.retryMaxDelayMs
    this.#random = options.random ?? Math.random
  }

  async enqueue(input: EnqueueRetryInput<TPayload>): Promise<RetryQueueItem<TPayload>> {
    required(input.ownerId, 'Retry ownerId')
    required(input.operation, 'Retry operation')

    const now = new Date()
    const id = randomId()
    const item: RetryQueueItem<TPayload> = {
      id,
      ownerId: input.ownerId,
      operation: input.operation,
      mode: input.mode ?? 'manual',
      idempotencyKey: input.idempotencyKey ?? randomId(),
      payload: input.payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: input.maxAttempts ?? this.#defaultMaxAttempts,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      nextAttemptAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? this.#defaultTtlMs)).toISOString(),
    }

    await withStore<void>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        await requestToPromise(store.add(item))
      },
      this.#databaseName,
    )
    return item
  }

  async get(id: string, ownerId: string): Promise<RetryQueueItem<TPayload> | undefined> {
    const item = await withStore<RetryQueueItem<TPayload> | undefined>(
      PWA_STORAGE.retryQueueStore,
      'readonly',
      async (store) =>
        (await requestToPromise(store.get(id))) as RetryQueueItem<TPayload> | undefined,
      this.#databaseName,
    )
    return item?.ownerId === ownerId ? item : undefined
  }

  async list(ownerId: string): Promise<RetryQueueItem<TPayload>[]> {
    const items = await withStore<RetryQueueItem<TPayload>[]>(
      PWA_STORAGE.retryQueueStore,
      'readonly',
      async (store) =>
        (await requestToPromise(store.index('ownerId').getAll(ownerId))) as RetryQueueItem<TPayload>[],
      this.#databaseName,
    )
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async count(ownerId: string, statuses?: RetryStatus[]): Promise<number> {
    const items = await this.list(ownerId)
    return statuses ? items.filter((item) => statuses.includes(item.status)).length : items.length
  }


  async clearOwner(ownerId: string): Promise<number> {
    return withStore<number>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        const items = (await requestToPromise(
          store.index('ownerId').getAll(ownerId),
        )) as RetryQueueItem<TPayload>[]
        for (const item of items) store.delete(item.id)
        return items.length
      },
      this.#databaseName,
    )
  }

  async claimReady(options: ClaimRetryOptions): Promise<RetryQueueItem<TPayload>[]> {
    const now = options.now ?? Date.now()
    const limit = Math.max(1, options.limit ?? 10)

    return withStore<RetryQueueItem<TPayload>[]>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        const items = (await requestToPromise(
          store.index('ownerId').getAll(options.ownerId),
        )) as RetryQueueItem<TPayload>[]

        const ready = items
          .filter((item) => {
            if (isExpired(item, now)) return false
            if (item.attempts >= item.maxAttempts) return false
            if (!options.includeManual && item.mode !== 'automatic') return false
            if (!['pending', 'failed'].includes(item.status)) return false
            return new Date(item.nextAttemptAt).getTime() <= now
          })
          .sort((a, b) => a.nextAttemptAt.localeCompare(b.nextAttemptAt))
          .slice(0, limit)

        const leaseUntil = new Date(now + this.#leaseMs).toISOString()
        const claimed = ready.map((item) => ({
          ...item,
          status: 'processing' as const,
          attempts: item.attempts + 1,
          leaseUntil,
          updatedAt: new Date(now).toISOString(),
        }))

        for (const item of claimed) store.put(item)
        return claimed
      },
      this.#databaseName,
    )
  }

  async complete(id: string, ownerId: string): Promise<boolean> {
    const item = await this.get(id, ownerId)
    if (!item) return false

    await withStore<void>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        await requestToPromise(store.delete(id))
      },
      this.#databaseName,
    )
    return true
  }

  async fail(
    id: string,
    ownerId: string,
    error: RetryError,
    now = Date.now(),
  ): Promise<RetryStatus | undefined> {
    const item = await this.get(id, ownerId)
    if (!item) return undefined

    const exhausted = item.attempts >= item.maxAttempts
    const status: RetryStatus = !error.retryable ? 'blocked' : exhausted ? 'dead' : 'failed'
    const delay = Math.min(
      this.#maxDelayMs,
      this.#baseDelayMs * 2 ** Math.max(0, item.attempts - 1),
    )
    const jitteredDelay = Math.round(delay * (0.8 + this.#random() * 0.4))

    const updated: RetryQueueItem<TPayload> = {
      ...item,
      status,
      lastError: error,
      leaseUntil: undefined,
      nextAttemptAt: new Date(now + jitteredDelay).toISOString(),
      updatedAt: new Date(now).toISOString(),
    }

    await withStore<void>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        await requestToPromise(store.put(updated))
      },
      this.#databaseName,
    )
    return status
  }

  async releaseExpiredLeases(now = Date.now()): Promise<number> {
    return withStore<number>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        const items = (await requestToPromise(store.getAll())) as RetryQueueItem<TPayload>[]
        const expired = items.filter(
          (item) =>
            item.status === 'processing' &&
            item.leaseUntil !== undefined &&
            new Date(item.leaseUntil).getTime() <= now,
        )

        for (const item of expired) {
          store.put({
            ...item,
            status: 'failed',
            leaseUntil: undefined,
            nextAttemptAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
            lastError: {
              code: 'RETRY_LEASE_EXPIRED',
              message: 'The previous retry attempt did not finish before its lease expired.',
              retryable: true,
            },
          } satisfies RetryQueueItem<TPayload>)
        }
        return expired.length
      },
      this.#databaseName,
    )
  }

  async pruneExpired(now = Date.now()): Promise<number> {
    return withStore<number>(
      PWA_STORAGE.retryQueueStore,
      'readwrite',
      async (store) => {
        const items = (await requestToPromise(store.getAll())) as RetryQueueItem<TPayload>[]
        const expired = items.filter((item) => isExpired(item, now))
        for (const item of expired) store.delete(item.id)
        return expired.length
      },
      this.#databaseName,
    )
  }

  async process(options: ProcessRetryQueueOptions<TPayload>): Promise<RetryProcessSummary> {
    await this.releaseExpiredLeases()
    await this.pruneExpired()

    const claimed = await this.claimReady({
      ownerId: options.ownerId,
      limit: options.limit,
      includeManual: false,
    })
    const summary: RetryProcessSummary = {
      claimed: claimed.length,
      succeeded: 0,
      failed: 0,
      blocked: 0,
      dead: 0,
    }

    for (const item of claimed) {
      try {
        await options.execute(item)
        await this.complete(item.id, item.ownerId)
        summary.succeeded += 1
      } catch (error) {
        const normalized = options.normalizeError?.(error, item) ?? defaultNormalizeError(error)
        const status = await this.fail(item.id, item.ownerId, normalized)
        if (status === 'blocked') summary.blocked += 1
        else if (status === 'dead') summary.dead += 1
        else summary.failed += 1
      }
    }

    return summary
  }
}

export function createRetryQueue<TPayload extends JsonValue = JsonValue>(
  options?: RetryQueueOptions,
): RetryQueue<TPayload> {
  return new RetryQueue<TPayload>(options)
}
