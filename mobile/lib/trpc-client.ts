import { createAppTrpcClient } from '@accounting/api-client'

import { resolveTrpcUrl } from './env.ts'
import { readAuthCookieHeader } from './trpc-auth.ts'

export function createMobileTrpcClient() {
  return createAppTrpcClient({
    url: resolveTrpcUrl(),
    getAuthHeaders: async () => {
      const cookie = readAuthCookieHeader()
      return cookie ? { cookie } : {}
    },
  })
}

export const trpcClient = createMobileTrpcClient()
