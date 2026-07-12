import { describe, expect, it } from 'vitest'
import { classifyRequest, isResponseSafeToCache } from '../src/security'

describe('request policy', () => {
  it('blocks authenticated and sensitive requests', () => {
    const request = new Request('https://api.kenarhinlabs.com/admin/content', {
      headers: { authorization: 'Bearer secret' },
    })

    expect(
      classifyRequest(request, {
        sensitiveOrigins: ['https://api.kenarhinlabs.com'],
      }),
    ).toEqual({ cacheable: false, reason: 'sensitive-origin' })
  })

  it('rejects private responses', () => {
    const response = new Response('{}', {
      status: 200,
      headers: { 'cache-control': 'private, no-store' },
    })
    expect(isResponseSafeToCache(response)).toBe(false)
  })
})
