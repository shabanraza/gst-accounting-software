import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import { createAppTrpcClient } from '@accounting/api-client'

import { TRPCProvider } from '#/integrations/trpc/react'
import { getTrpcUrl } from '#/lib/server-base-url.ts'

function getInitialTrpcUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/trpc`
  }

  try {
    return getTrpcUrl()
  } catch {
    return '/api/trpc'
  }
}

export const trpcClient = createAppTrpcClient({
  url: getInitialTrpcUrl(),
})

const QUERY_STALE_TIME_MS = 60_000

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  })
  const context = {
    queryClient,
    trpc: serverHelpers,
  }

  return context
}

export default function TanstackQueryProvider({
  children,
  context,
}: {
  children: ReactNode
  context: ReturnType<typeof getContext>
}) {
  const { queryClient } = context

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
