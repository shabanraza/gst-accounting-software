import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { resolveAuthBaseUrl } from './env.ts'

const isWeb = Platform.OS === 'web'

const webStorage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value)
  },
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  fetchOptions: isWeb ? { credentials: 'omit' } : undefined,
  plugins: [
    expoClient({
      scheme: 'gstbooks',
      storagePrefix: 'gstbooks',
      storage: isWeb ? webStorage : SecureStore,
    }),
  ],
})
