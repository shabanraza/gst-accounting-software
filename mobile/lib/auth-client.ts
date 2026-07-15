import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import { Platform } from 'react-native'

import {
  authRawStorage,
  AUTH_STORAGE_PREFIX,
  clearSessionToken,
  readSessionToken,
  writeSessionToken,
} from './auth-storage.ts'
import { resolveAuthBaseUrl } from './env.ts'

const isWeb = Platform.OS === 'web'

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  fetchOptions: {
    ...(isWeb ? { credentials: 'omit' as const } : {}),
    auth: {
      type: 'Bearer',
      token: () => readSessionToken() ?? '',
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token')
      if (authToken) {
        void writeSessionToken(authToken)
        return
      }

      const url = String(ctx.request?.url ?? '')
      if (url.includes('sign-out')) {
        void clearSessionToken()
      }
    },
  },
  plugins: [
    expoClient({
      scheme: 'gstbooks',
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: authRawStorage,
    }),
  ],
})
