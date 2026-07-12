import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createDraftStore, createRetryQueue, deletePwaDatabase } from '../src/storage'

const databaseName = 'kal-pwa-test'

afterEach(async () => {
  await deletePwaDatabase(databaseName)
})

describe('DraftStore', () => {
  it('namespaces identical logical keys by owner', async () => {
    const drafts = createDraftStore<{ title: string }>({ databaseName })

    await drafts.save({
      key: 'content:new',
      ownerId: 'user-a',
      kind: 'content',
      payload: { title: 'Owner A' },
    })
    await drafts.save({
      key: 'content:new',
      ownerId: 'user-b',
      kind: 'content',
      payload: { title: 'Owner B' },
    })

    expect((await drafts.get('content:new', 'user-a'))?.payload.title).toBe('Owner A')
    expect((await drafts.get('content:new', 'user-b'))?.payload.title).toBe('Owner B')

    expect(await drafts.clearOwner('user-a')).toBe(1)
    expect(await drafts.get('content:new', 'user-a')).toBeUndefined()
    expect((await drafts.get('content:new', 'user-b'))?.payload.title).toBe('Owner B')
  })

  it('updates one owner draft without changing its original creation time', async () => {
    const drafts = createDraftStore<{ title: string }>({ databaseName })
    const first = await drafts.save({
      key: 'content:1',
      ownerId: 'user-a',
      kind: 'content',
      payload: { title: 'First' },
    })
    const updated = await drafts.save({
      key: 'content:1',
      ownerId: 'user-a',
      kind: 'content',
      payload: { title: 'Updated' },
    })

    expect(updated.createdAt).toBe(first.createdAt)
    expect(updated.payload.title).toBe('Updated')
    expect(await drafts.list('user-a', 'content')).toHaveLength(1)
  })

  it('removes expired drafts', async () => {
    const drafts = createDraftStore<{ title: string }>({ databaseName })
    await drafts.save({
      key: 'content:expired',
      ownerId: 'user-a',
      kind: 'content',
      payload: { title: 'Expired' },
      ttlMs: -1,
    })

    expect(await drafts.get('content:expired', 'user-a')).toBeUndefined()
    expect(await drafts.list('user-a')).toHaveLength(0)
  })
})

describe('RetryQueue', () => {
  it('does not automatically claim manual operations', async () => {
    const queue = createRetryQueue<{ contentId: string }>({ databaseName })
    await queue.enqueue({
      ownerId: 'user-a',
      operation: 'content.publish',
      payload: { contentId: 'content-1' },
    })

    expect(await queue.claimReady({ ownerId: 'user-a' })).toHaveLength(0)
    expect(
      await queue.claimReady({ ownerId: 'user-a', includeManual: true }),
    ).toHaveLength(1)
  })

  it('processes explicitly automatic operations and removes successful items', async () => {
    const queue = createRetryQueue<{ draftId: string }>({ databaseName })
    await queue.enqueue({
      ownerId: 'user-a',
      operation: 'draft.save',
      mode: 'automatic',
      payload: { draftId: 'draft-1' },
    })

    const summary = await queue.process({
      ownerId: 'user-a',
      execute: async () => undefined,
    })

    expect(summary).toMatchObject({
      claimed: 1,
      succeeded: 1,
      failed: 0,
      blocked: 0,
      dead: 0,
    })
    expect(await queue.count('user-a')).toBe(0)
  })

  it('blocks non-retryable failures and clears only the matching owner', async () => {
    const queue = createRetryQueue<{ draftId: string }>({ databaseName })
    await queue.enqueue({
      ownerId: 'user-a',
      operation: 'draft.save',
      mode: 'automatic',
      payload: { draftId: 'a' },
    })
    await queue.enqueue({
      ownerId: 'user-b',
      operation: 'draft.save',
      mode: 'automatic',
      payload: { draftId: 'b' },
    })

    const summary = await queue.process({
      ownerId: 'user-a',
      execute: async () => {
        throw new Error('Forbidden')
      },
      normalizeError: () => ({
        code: 'FORBIDDEN',
        message: 'Permission denied',
        retryable: false,
        httpStatus: 403,
      }),
    })

    expect(summary).toMatchObject({ blocked: 1, dead: 0 })
    expect((await queue.list('user-a'))[0]?.status).toBe('blocked')
    expect(await queue.clearOwner('user-a')).toBe(1)
    expect(await queue.count('user-b')).toBe(1)
  })
})
