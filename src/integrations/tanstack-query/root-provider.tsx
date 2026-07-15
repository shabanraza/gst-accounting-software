import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import { createAppTrpcClient } from '@accounting/api-client'

import { TRPCProvider } from '#/integrations/trpc/react'
import { getTrpcUrl } from '#/lib/server-base-url.ts'

export const trpcClient = createAppTrpcClient({
  url: getTrpcUrl(),
})