import { getSetCookie, normalizeCookieName } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { authClient } from './auth-client.ts'

const AUTH_STORAGE_PREFIX = 'gstbooks'
const SESSION_COOKIE_NAME = 'better-auth.session_token'
const COOKIE_STORAGE_KEY = normalizeCookieName(`${AUTH_STORAGE_PREFIX}_cookie`)
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function getAuthStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof localStorage === 'undefined') return null
        return localStorage.getItem(key)
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value)
      },
    }
  }

  return {
    getItem: (key: string) => SecureStore.getItem(key),
    setItem: (key: string, value: string) => {
      SecureStore.setItem(key, value)
    },
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function readAuthCookieHeader() {
  return authClient.getCookie?.() ?? ''
}

function readStoredAuthCookieJson() {
  return getAuthStorage().getItem(COOKIE_STORAGE_KEY) ?? '{}'
}

function writeStoredAuthCookieJson(value: string) {
  getAuthStorage().setItem(COOKIE_STORAGE_KEY, value)
}

export function persistSignInSessionToken(token: string) {
  const setCookieHeader = `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/`
  const next = getSetCookie(setCookieHeader, readStoredAuthCookieJson())
  writeStoredAuthCookieJson(next)
}

export async function ensureTrpcAuthReady(options?: {
  signInToken?: string | null
}) {
  if (!readAuthCookieHeader()) {
    await authClient.getSession()
  }

  if (!readAuthCookieHeader() && options?.signInToken) {
    persistSignInSessionToken(options.signInToken)
  }

  const deadline = Date.now() + 2_000
  while (!readAuthCookieHeader() && Date.now() < deadline) {
    await authClient.getSession()

    if (!readAuthCookieHeader() && options?.signInToken) {
      persistSignInSessionToken(options.signInToken)
    }

    await delay(50)
  }
}
