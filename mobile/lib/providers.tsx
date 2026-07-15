import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { TRPCRouter } from '@accounting/api-client/types'

import { trpcClient } from './trpc-client.ts'

const { TRPCProvider, useTRPC } = createTRPCContext<TRPCRouter>()

export { useTRPC }

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
