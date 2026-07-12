import { describe, expect, it } from 'vitest'
import { createOriginsPattern, createSameOriginPathsPattern } from '../src/config'

describe('URL pattern helpers', () => {
  it('matches only configured origins', () => {
    const pattern = createOriginsPattern([
      'https://api.kenarhinlabs.com',
      'https://example.supabase.co',
    ])

    expect(pattern?.test('https://api.kenarhinlabs.com/v1/content')).toBe(true)
    expect(pattern?.test('https://example.supabase.co/auth/v1/user')).toBe(true)
    expect(pattern?.test('https://evil.example/api.kenarhinlabs.com')).toBe(false)
  })

  it('matches complete path prefixes without sibling collisions', () => {
    const pattern = createSameOriginPathsPattern('https://kenarhinlabs.com', ['/api'])

    expect(pattern?.test('https://kenarhinlabs.com/api/content')).toBe(true)
    expect(pattern?.test('https://kenarhinlabs.com/api?x=1')).toBe(true)
    expect(pattern?.test('https://kenarhinlabs.com/api-v2')).toBe(false)
  })
})
