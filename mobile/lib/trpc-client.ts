import { createAppTrpcClient } from '@accounting/api-client'

import { resolveTrpcUrl } from './env.ts'
import { handleUnauthorizedSession } from './session-expired.ts'
import {
  readTrpcAuthHeaders,
} from './trpc-auth.ts'

export function createMobileTrpcClient() {
  return createAppTrpcClient({
    url: resolveTrpcUrl(),
    getAuthHeaders: async () => readTrpcAuthHeaders(),
    onUnauthorized: () => {
      void handleUnauthorizedSession()
    },
  })
}

export const trpcClient = createMobileTrpcClient()
