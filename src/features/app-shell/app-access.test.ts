import { QueryClient } from '@tanstack/react-query'
import { describe, expect, test } from 'vitest'

import {
  clearAppAccess,
  ensureAppAccess,
} from '#/features/app-shell/app-access.ts'

function deps(overrides: { session?: boolean; companies?: number } = {}) {
  const calls = { session: 0, companies: 0 }
  return {
    calls,
    hasSession: async () => {
      calls.session += 1
      return overrides.session ?? true
    },
    listCompanies: async () => {
      calls.companies += 1
      return Array.from({ length: overrides.companies ?? 1 }, () => ({}))
    },
  }
}

describe('ensureAppAccess', () => {
  test('checks once, then reuses the result on later navigations', async () => {
    const queryClient = new QueryClient()
    const check = deps()

    expect(await ensureAppAccess(queryClient, check)).toBe('ok')
    expect(await ensureAppAccess(queryClient, check)).toBe('ok')
    expect(check.calls).toEqual({ session: 1, companies: 1 })
  })

  test('sends signed-out visitors to login and does not remember it', async () => {
    const queryClient = new QueryClient()
    const check = deps({ session: false })

    expect(await ensureAppAccess(queryClient, check)).toBe('login')
    expect(await ensureAppAccess(queryClient, check)).toBe('login')
    expect(check.calls.session).toBe(2)
  })

  test('sends users without a company to onboarding and re-checks next time', async () => {
    const queryClient = new QueryClient()
    const check = deps({ companies: 0 })

    expect(await ensureAppAccess(queryClient, check)).toBe('onboarding')
    expect(await ensureAppAccess(queryClient, check)).toBe('onboarding')
    expect(check.calls.companies).toBe(2)
  })

  test('sign-out clears the remembered result', async () => {
    const queryClient = new QueryClient()
    const check = deps()

    await ensureAppAccess(queryClient, check)
    clearAppAccess(queryClient)
    await ensureAppAccess(queryClient, check)
    expect(check.calls.session).toBe(2)
  })
})
