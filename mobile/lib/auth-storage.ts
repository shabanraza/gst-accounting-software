import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const AUTH_STORAGE_PREFIX = 'hisaabkro'
export const AUTH_SESSION_TOKEN_KEY = `${AUTH_STORAGE_PREFIX}_session_token`
export const SESSION_COOKIE_NAME = 'better-auth.session_token'

const webStorage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    localStorage.removeItem(key)
  },
}

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItem(key),
  setItem: (key: string, value: string) => {
    SecureStore.setItem(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

const storage = Platform.OS === 'web' ? webStorage : nativeStorage

export const authRawStorage = storage

export function readSessionToken() {
  const value = storage.getItem(AUTH_SESSION_TOKEN_KEY)
  return value?.trim() ? value : null
}

export async function writeSessionToken(token: string) {
  await storage.setItem(AUTH_SESSION_TOKEN_KEY, token)
}

export async function clearSessionToken() {
  await storage.removeItem(AUTH_SESSION_TOKEN_KEY)
}
