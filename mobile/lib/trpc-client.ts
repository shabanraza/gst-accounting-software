import { createAppTrpcClient } from '@accounting/api-client'

import { resolveTrpcUrl } from './env.ts'
import { readTrpcAuthHeaders } from './trpc-auth.ts'

export function createMobileTrpcClient() {
  return createAppTrpcClient({
    url: resolveTrpcUrl(),
    getAuthHeaders: async () => readTrpcAuthHeaders(),
  })
}

export const trpcClient = createMobileTrpcClient()
