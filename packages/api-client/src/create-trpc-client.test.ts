import { describe, expect, it, vi } from 'vitest'

import { buildTrpcAuthHeaders, createAppTrpcClient } from './create-trpc-client.ts'

describe('buildTrpcAuthHeaders', () => {
  it('returns empty headers when no auth provider is configured', async () => {
    await expect(buildTrpcAuthHeaders()).resolves.toEqual({})
  })

  it('merges cookie and authorization headers from the auth provider', async () => {
    const getAuthHeaders = vi.fn(async () => ({
      cookie: 'better-auth.session=abc',
      Authorization: 'Bearer token-123',
    }))

    await expect(buildTrpcAuthHeaders(getAuthHeaders)).resolves.toEqual({
      cookie: 'better-auth.session=abc',
      Authorization: 'Bearer token-123',
    })
  })

  it('drops empty header values', async () => {
    const getAuthHeaders = vi.fn(async () => ({
      cookie: '',
      Authorization: 'Bearer token-123',
    }))

    await expect(buildTrpcAuthHeaders(getAuthHeaders)).resolves.toEqual({
      Authorization: 'Bearer token-123',
    })
  })
})

describe('createAppTrpcClient', () => {
  it('creates a tRPC client for the configured base URL', () => {
    const client = createAppTrpcClient({
      url: 'http://localhost:3000/api/trpc',
    })

    expect(client).toBeDefined()
  })
})
