import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolvePostAuthHref } from './post-auth-route.ts'

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
}))

describe('resolvePostAuthHref', () => {
  beforeEach(() => {
    listCompanies.mockReset()
    ensureTrpcAuthReady.mockReset()
    ensureTrpcAuthReady.mockResolvedValue(undefined)
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
})
