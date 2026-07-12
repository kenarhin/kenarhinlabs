import { describe, expect, it } from 'vitest'
import { createAdminPwaOptions, createPublicPwaOptions } from '../src/config'

function runtimeRules(options: ReturnType<typeof createPublicPwaOptions>) {
  return options.workbox?.runtimeCaching ?? []
}

describe('PWA configuration factories', () => {
  it('creates a public policy with public page and media caches', () => {
    const options = createPublicPwaOptions({
      siteUrl: 'https://kenarhinlabs.com',
      apiBaseUrl: 'https://api.kenarhinlabs.com',
      publicMediaOrigins: ['https://media.kenarhinlabs.com'],
    })

    expect(options.strategies).toBe('generateSW')
    expect(options.registerType).toBe('prompt')
    expect(options.injectRegister).toBeNull()
    expect(options.workbox?.navigateFallback).toBeNull()
    expect(options.manifest).toMatchObject({
      id: '/',
      start_url: '/',
      scope: '/',
      short_name: 'KAL Labs',
    })

    const handlers = runtimeRules(options).map((rule) => rule.handler)
    expect(handlers).toContain('NetworkOnly')
    expect(handlers).toContain('NetworkFirst')
    expect(handlers).toContain('StaleWhileRevalidate')
    expect(handlers).toContain('CacheFirst')
  })

  it('creates a strict admin policy with no broad runtime page cache', () => {
    const options = createAdminPwaOptions({
      siteUrl: 'https://admin.kenarhinlabs.com',
      apiBaseUrl: 'https://api.kenarhinlabs.com',
      supabaseUrl: 'https://example.supabase.co',
    })

    expect(options.manifest).toMatchObject({
      start_url: '/dashboard',
      short_name: 'KAL Admin',
    })

    const handlers = runtimeRules(options)
    expect(handlers.length).toBeGreaterThanOrEqual(3)
    expect(handlers.every((rule) => rule.handler === 'NetworkOnly')).toBe(true)
  })

  it('rejects insecure production origins', () => {
    expect(() =>
      createPublicPwaOptions({ siteUrl: 'http://kenarhinlabs.com' }),
    ).toThrow(/HTTPS/)
  })
})
