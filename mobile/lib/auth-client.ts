import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

import { resolveAuthBaseUrl } from './env.ts'

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'gstbooks',
      storagePrefix: 'gstbooks',
      storage: SecureStore,
    }),
  ],
})
