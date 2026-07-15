import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

const { getSession, getCookie } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock('@better-auth/expo/client', () => ({
  getSetCookie: (header: string, prev = '{}') => {
    const parsed = JSON.parse(prev) as Record<
      string,
      { value: string; expires: string | null }
    >
    const [nameValue] = header.split(';')
    const [name, value] = nameValue.split('=')
    parsed[name] = { value, expires: null }
    return JSON.stringify(parsed)
  },
  getCookie: (cookie: string) => {
    const parsed = JSON.parse(cookie) as Record<
      string,
      { value: string; expires: string | null }
    >
    return Object.entries(parsed)
      .map(([key, entry]) => `${key}=${entry.value}`)
      .join('; ')
  },
  normalizeCookieName: (name: string) => name,
  storageAdapter: (storage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => unknown
  }) => ({
    getItem: (key: string) => storage.getItem(key),
    setItem: async (key: string, value: string) => {
      storage.setItem(key, value)
    },
  }),
}))

vi.mock('expo-secure-store', () => ({
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
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
  extractSignInToken,
  persistSignInSessionToken,
  readAuthCookieHeader,
} from './trpc-auth.ts'

describe('trpc-auth', () => {
  beforeEach(() => {
    storage.clear()
    getSession.mockReset()
    getCookie.mockReset()
    getSession.mockResolvedValue({ data: null })
  })

  it('reads the auth cookie header from the auth client', () => {
    getCookie.mockReturnValue('better-auth.session_token=abc')

    expect(readAuthCookieHeader()).toBe('better-auth.session_token=abc')
  })

  it('falls back to stored cookie json when auth client cookie is empty', async () => {
    getCookie.mockReturnValue('')
    await persistSignInSessionToken('session-token-123')

    expect(readAuthCookieHeader()).toContain(
      'better-auth.session_token=session-token-123',
    )
  })

  it('persists a sign-in token into expo cookie storage', async () => {
    getCookie.mockImplementation(() => {
      const raw = storage.get('gstbooks_cookie')
      if (!raw) return ''
      const parsed = JSON.parse(raw) as Record<
        string,
        { value: string; expires: string | null }
      >
      return Object.entries(parsed)
        .map(([key, entry]) => `${key}=${entry.value}`)
        .join('; ')
    })

    await persistSignInSessionToken('session-token-123')

    expect(readAuthCookieHeader()).toContain(
      'better-auth.session_token=session-token-123',
    )
  })

  it('uses the sign-in token when the auth cookie is not ready yet', async () => {
    getCookie.mockImplementation(() => {
      const raw = storage.get('gstbooks_cookie')
      if (!raw) return ''
      const parsed = JSON.parse(raw) as Record<
        string,
        { value: string; expires: string | null }
      >
      return Object.entries(parsed)
        .map(([key, entry]) => `${key}=${entry.value}`)
        .join('; ')
    })

    await ensureTrpcAuthReady({ signInToken: 'session-token-123' })

    expect(getSession).toHaveBeenCalled()
    expect(readAuthCookieHeader()).toContain(
      'better-auth.session_token=session-token-123',
    )
  })

  it('extracts sign-in tokens from auth responses', () => {
    expect(extractSignInToken({ data: { token: 'abc' } })).toBe('abc')
    expect(extractSignInToken({ data: null })).toBeNull()
  })
})
