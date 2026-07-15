import { authClient } from './auth-client.ts'
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  writeSessionToken,
} from './auth-storage.ts'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function extractTokenFromCookieHeader(cookie: string) {
  const pattern = new RegExp(
    `(?:^|;\\s*)${SESSION_COOKIE_NAME.replace('.', '\\.')}=([^;]+)`,
  )
  const match = cookie.match(pattern)
  return match?.[1]?.trim() ?? null
}

export function readSessionTokenForAuth() {
  const stored = readSessionToken()
  if (stored) return stored

  const cookie = authClient.getCookie?.() ?? ''
  return extractTokenFromCookieHeader(cookie)
}

export function readTrpcAuthHeaders(): Record<string, string> {
  const token = readSessionTokenForAuth()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function persistSessionToken(token: string) {
  await writeSessionToken(token)
}

export function extractSignInToken(result: {
  data?: { token?: string | null } | null
}) {
  return result.data?.token ?? null
}

export function extractAuthTokenFromResponse(response: Response) {
  return response.headers.get('set-auth-token')
}

export async function ensureTrpcAuthReady(options?: {
  signInToken?: string | null
}) {
  const signInToken = options?.signInToken
  if (signInToken) {
    await persistSessionToken(signInToken)
  }

  if (!readSessionTokenForAuth()) {
    await authClient.getSession()
    const fromCookie = extractTokenFromCookieHeader(authClient.getCookie?.() ?? '')
    if (fromCookie) {
      await persistSessionToken(fromCookie)
    }
  }

  const deadline = Date.now() + 2_000
  while (!readSessionTokenForAuth() && Date.now() < deadline) {
    await authClient.getSession()

    const fromCookie = extractTokenFromCookieHeader(authClient.getCookie?.() ?? '')
    if (fromCookie) {
      await persistSessionToken(fromCookie)
    }

    if (signInToken) {
      await persistSessionToken(signInToken)
    }

    await delay(50)
  }
}
