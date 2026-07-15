import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolvePostAuthHref, PostAuthRouteError } from './post-auth-route.ts'

const listCompanies = vi.fn()
const ensureTrpcAuthReady = vi.fn()

vi.mock('./trpc-client.ts', () => ({
  trpcClient: {
    companies: {
      list: {
        query: (...args: unknown[]) => listCompanies(...args),
      },
    },
  },
}))

vi.mock('./trpc-auth.ts', () => ({
  ensureTrpcAuthReady: (...args: unknown[]) => ensureTrpcAuthReady(...args),
  readSessionTokenForAuth: (...args: unknown[]) =>
    readSessionTokenForAuth(...args),
}))

const readSessionTokenForAuth = vi.fn()

describe('resolvePostAuthHref', () => {
  beforeEach(() => {
    listCompanies.mockReset()
    ensureTrpcAuthReady.mockReset()
    readSessionTokenForAuth.mockReset()
    ensureTrpcAuthReady.mockResolvedValue(undefined)
    readSessionTokenForAuth.mockReturnValue(null)
  })
  it('routes new accounts to onboarding', async () => {
    listCompanies.mockResolvedValueOnce([])

    await expect(resolvePostAuthHref()).resolves.toBe('/onboarding')
    expect(ensureTrpcAuthReady).toHaveBeenCalled()
  })

  it('routes existing accounts to the dashboard', async () => {
    listCompanies.mockResolvedValueOnce([{ id: 'company-1' }])

    await expect(resolvePostAuthHref()).resolves.toBe('/(app)/(tabs)/dashboard')
  })

  it('routes to dashboard when company lookup fails', async () => {
    listCompanies.mockRejectedValue(new Error('offline'))

    await expect(resolvePostAuthHref()).resolves.toBe('/(app)/(tabs)/dashboard')
  })

  it('retries company lookup after unauthorized responses', async () => {
    listCompanies
      .mockRejectedValueOnce({ data: { code: 'UNAUTHORIZED' } })
      .mockResolvedValueOnce([{ id: 'company-1' }])

    await expect(resolvePostAuthHref()).resolves.toBe('/(app)/(tabs)/dashboard')
    expect(listCompanies).toHaveBeenCalledTimes(2)
    expect(ensureTrpcAuthReady).toHaveBeenCalledTimes(2)
  })

  it('throws when company lookup stays unauthorized with a stored token', async () => {
    listCompanies.mockRejectedValue({ data: { code: 'UNAUTHORIZED' } })
    readSessionTokenForAuth.mockReturnValue('stored-token')

    await expect(resolvePostAuthHref()).rejects.toBeInstanceOf(
      PostAuthRouteError,
    )
    expect(listCompanies).toHaveBeenCalledTimes(3)
  })
})
