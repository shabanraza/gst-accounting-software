import { getCookie as formatAuthCookie, getSetCookie } from '@better-auth/expo/client'

import { authClient } from './auth-client.ts'
import {
  AUTH_COOKIE_NAME,
  authCookieStorage,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './auth-storage.ts'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function readAuthCookieHeader() {
  const fromClient = authClient.getCookie?.() ?? ''
  if (fromClient) return fromClient

  return formatAuthCookie(authCookieStorage.getItem(AUTH_COOKIE_NAME) ?? '{}')
}

export async function persistSignInSessionToken(token: string) {
  const setCookieHeader = `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/`
  const prev = authCookieStorage.getItem(AUTH_COOKIE_NAME) ?? '{}'
  const next = getSetCookie(setCookieHeader, prev)
  await authCookieStorage.setItem(AUTH_COOKIE_NAME, next)
}

export function extractSignInToken(result: {
  data?: { token?: string | null } | null
}) {
  return result.data?.token ?? null
}

export async function ensureTrpcAuthReady(options?: {
  signInToken?: string | null
}) {
  if (!readAuthCookieHeader()) {
    await authClient.getSession()
  }

  const signInToken = options?.signInToken
  if (!readAuthCookieHeader() && signInToken) {
    await persistSignInSessionToken(signInToken)
  }

  const deadline = Date.now() + 2_000
  while (!readAuthCookieHeader() && Date.now() < deadline) {
    await authClient.getSession()

    if (!readAuthCookieHeader() && signInToken) {
      await persistSignInSessionToken(signInToken)
    }

    await delay(50)
  }
}
