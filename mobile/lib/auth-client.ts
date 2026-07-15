import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import { Platform } from 'react-native'

import { createMobileAuthCookiePlugin } from './auth-cookie-plugin.ts'
import { authRawStorage, AUTH_STORAGE_PREFIX } from './auth-storage.ts'
import { resolveAuthBaseUrl } from './env.ts'

const isWeb = Platform.OS === 'web'

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  fetchOptions: isWeb ? { credentials: 'omit' } : undefined,
  plugins: [
    expoClient({
      scheme: 'gstbooks',
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: authRawStorage,
    }),
    ...(isWeb ? [createMobileAuthCookiePlugin()] : []),
  ],
})
