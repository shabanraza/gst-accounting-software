import { describe, expect, it, vi } from 'vitest'

import { resolvePostAuthHref } from './post-auth-route.ts'

const listCompanies = vi.fn()

vi.mock('./trpc-client.ts', () => ({
  trpcClient: {
    companies: {
      list: {
        query: (...args: unknown[]) => listCompanies(...args),
      },
    },
  },
}))

describe('resolvePostAuthHref', () => {
  it('routes new accounts to onboarding', async () => {
    listCompanies.mockResolvedValueOnce([])

    await expect(resolvePostAuthHref()).resolves.toBe('/onboarding')
  })

  it('routes existing accounts to the dashboard', async () => {
    listCompanies.mockResolvedValueOnce([{ id: 'company-1' }])

    await expect(resolvePostAuthHref()).resolves.toBe('/(app)/(tabs)/dashboard')
  })

  it('falls back to onboarding when company lookup fails', async () => {
    listCompanies.mockRejectedValueOnce(new Error('offline'))

    await expect(resolvePostAuthHref()).resolves.toBe('/onboarding')
  })
})
