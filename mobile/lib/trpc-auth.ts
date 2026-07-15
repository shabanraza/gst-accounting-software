import { authClient, consumeLastAuthToken } from './auth-client.ts'
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  writeSessionToken,
} from './auth-storage.ts'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeSessionToken(token: string) {
  const trimmed = token.trim()
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

export function pickBestSessionToken(
  ...candidates: Array<string | null | undefined>
) {
  const valid = candidates
    .map((token) => (token ? normalizeSessionToken(token) : null))
    .filter((token): token is string => Boolean(token))

  const signed = valid.find((token) => token.includes('.'))
  return signed ?? valid[0] ?? null
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
  const cookie = authClient.getCookie?.() ?? ''
  const fromCookie = cookie ? extractTokenFromCookieHeader(cookie) : null

  return pickBestSessionToken(stored, fromCookie)
}

export function hasStoredAuthSession() {
  return Boolean(readSessionTokenForAuth())
}

export function readTrpcAuthHeaders(): Record<string, string> {
  const token = readSessionTokenForAuth()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function persistSessionToken(token: string) {
  const bestToken = pickBestSessionToken(token, readSessionToken())
  if (!bestToken) return
  await writeSessionToken(bestToken)
}

export function extractSignInToken(result: {
  data?: { token?: string | null } | null
  response?: Response
}) {
  return pickBestSessionToken(
    consumeLastAuthToken(),
    result.response ? extractAuthTokenFromResponse(result.response) : null,
    result.data?.token,
    readSessionToken(),
    extractTokenFromCookieHeader(authClient.getCookie?.() ?? ''),
  )
}

export function extractAuthTokenFromResponse(response: Response) {
  return response.headers.get('set-auth-token')
}

export async function persistAuthTokenFromSignIn(result: {
  data?: { token?: string | null } | null
  response?: Response
}) {
  const token = extractSignInToken(result)
  if (!token) return false
  await persistSessionToken(token)
  return true
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

export async function requireTrpcAuthReady(options?: {
  signInToken?: string | null
}) {
  await ensureTrpcAuthReady(options)
  if (!readSessionTokenForAuth()) {
    throw new Error('Session token was not saved after sign-in.')
  }
}
