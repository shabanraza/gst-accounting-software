import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

const { getSession, getCookie } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock('expo-secure-store', () => ({
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    storage.delete(key)
  },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

vi.mock('./auth-client.ts', () => ({
  authClient: {
    getSession,
    getCookie,
  },
}))

import {
  ensureTrpcAuthReady,
  extractAuthTokenFromResponse,
  extractSignInToken,
  extractTokenFromCookieHeader,
  persistSessionToken,
  readSessionTokenForAuth,
  readTrpcAuthHeaders,
} from './trpc-auth.ts'
import { AUTH_SESSION_TOKEN_KEY } from './auth-storage.ts'

describe('trpc-auth', () => {
  beforeEach(() => {
    storage.clear()
    getSession.mockReset()
    getCookie.mockReset()
    getSession.mockResolvedValue({ data: null })
  })

  it('builds bearer auth headers from the stored session token', async () => {
    await persistSessionToken('session-token-123')

    expect(readTrpcAuthHeaders()).toEqual({
      Authorization: 'Bearer session-token-123',
    })
  })

  it('falls back to the expo cookie header when no stored token exists', () => {
    getCookie.mockReturnValue('better-auth.session_token=session-token-123')

    expect(readSessionTokenForAuth()).toBe('session-token-123')
    expect(readTrpcAuthHeaders()).toEqual({
      Authorization: 'Bearer session-token-123',
    })
  })

  it('extracts session tokens from cookie headers', () => {
    expect(
      extractTokenFromCookieHeader(
        'better-auth.session_token=abc; better-auth.session_data=xyz',
      ),
    ).toBe('abc')
  })

  it('persists a sign-in token into secure storage', async () => {
    await persistSessionToken('session-token-123')

    expect(storage.get(AUTH_SESSION_TOKEN_KEY)).toBe('session-token-123')
    expect(readTrpcAuthHeaders()).toEqual({
      Authorization: 'Bearer session-token-123',
    })
  })

  it('uses the sign-in token when auth storage is not ready yet', async () => {
    await ensureTrpcAuthReady({ signInToken: 'session-token-123' })

    expect(readSessionTokenForAuth()).toBe('session-token-123')
    expect(readTrpcAuthHeaders()).toEqual({
      Authorization: 'Bearer session-token-123',
    })
  })

  it('refreshes the session when no token is available yet', async () => {
    getCookie
      .mockReturnValueOnce('')
      .mockReturnValue('better-auth.session_token=session-token-123')

    await ensureTrpcAuthReady()

    expect(getSession).toHaveBeenCalled()
    expect(storage.get(AUTH_SESSION_TOKEN_KEY)).toBe('session-token-123')
  })

  it('extracts sign-in tokens from auth responses', () => {
    expect(extractSignInToken({ data: { token: 'abc' } })).toBe('abc')
    expect(extractSignInToken({ data: null })).toBeNull()
  })

  it('extracts bearer tokens from set-auth-token response headers', () => {
    const response = new Response(null, {
      headers: { 'set-auth-token': 'header-token-123' },
    })

    expect(extractAuthTokenFromResponse(response)).toBe('header-token-123')
  })
})
