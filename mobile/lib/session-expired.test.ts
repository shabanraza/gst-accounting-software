import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleUnauthorizedSession, isSessionExpired } from './session-expired.ts'

const clearSessionToken = vi.fn()
const signOut = vi.fn()

vi.mock('./auth-storage.ts', () => ({
  clearSessionToken: (...args: unknown[]) => clearSessionToken(...args),
}))

vi.mock('./auth-client.ts', () => ({
  authClient: {
    signOut: (...args: unknown[]) => signOut(...args),
  },
}))

describe('session-expired', () => {
  beforeEach(() => {
    clearSessionToken.mockReset()
    signOut.mockReset()
    signOut.mockResolvedValue(undefined)
    clearSessionToken.mockResolvedValue(undefined)
  })

  it('clears stored auth on unauthorized session handling', async () => {
    await handleUnauthorizedSession()

    expect(clearSessionToken).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalled()
    expect(isSessionExpired()).toBe(true)
  })
})
