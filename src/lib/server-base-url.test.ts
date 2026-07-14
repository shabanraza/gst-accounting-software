import { afterEach, describe, expect, test, vi } from 'vitest'

import { getServerBaseUrl, getTrpcUrl } from '#/lib/server-base-url.ts'

describe('server base url', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('uses localhost in dev when BETTER_AUTH_URL is unset', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('PROD', false)

    expect(getServerBaseUrl()).toBe('http://localhost:3000')
    expect(getTrpcUrl()).toBe('http://localhost:3000/api/trpc')
  })

  test('uses configured localhost BETTER_AUTH_URL in dev', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('PROD', false)
    vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:8788/')

    expect(getServerBaseUrl()).toBe('http://localhost:8788')
  })

  test('uses production BETTER_AUTH_URL when not in dev', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    vi.stubEnv(
      'BETTER_AUTH_URL',
      'https://gst-accounting-software.shaban-razaa.workers.dev/',
    )

    expect(getServerBaseUrl()).toBe(
      'https://gst-accounting-software.shaban-razaa.workers.dev',
    )
    expect(getTrpcUrl()).toBe(
      'https://gst-accounting-software.shaban-razaa.workers.dev/api/trpc',
    )
  })

  test('rejects localhost BETTER_AUTH_URL in production', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000')

    expect(() => getServerBaseUrl()).toThrow(/cannot be localhost in production/)
  })
})
