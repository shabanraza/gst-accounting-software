import { createAppTrpcClient } from '@accounting/api-client'

import { authClient } from './auth-client.ts'
import { resolveTrpcUrl } from './env.ts'

export function createMobileTrpcClient() {
  return createAppTrpcClient({
    url: resolveTrpcUrl(),
    getAuthHeaders: async () => {
      const cookie = authClient.getCookie?.()
      return cookie ? { cookie } : {}
    },
  })
}

export const trpcClient = createMobileTrpcClient()
