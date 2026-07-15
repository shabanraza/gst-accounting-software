import { normalizeCookieName, storageAdapter } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const AUTH_STORAGE_PREFIX = 'gstbooks'
export const AUTH_COOKIE_PREFIX = 'better-auth'
export const AUTH_COOKIE_NAME = normalizeCookieName(`${AUTH_STORAGE_PREFIX}_cookie`)
export const SESSION_COOKIE_NAME = 'better-auth.session_token'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const webStorage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value)
  },
}

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItem(key),
  setItem: (key: string, value: string) => {
    SecureStore.setItem(key, value)
  },
}

export const authRawStorage = Platform.OS === 'web' ? webStorage : nativeStorage
export const authCookieStorage = storageAdapter(authRawStorage)
