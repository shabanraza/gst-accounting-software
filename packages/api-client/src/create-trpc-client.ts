import superjson from 'superjson'
import { createTRPCClient, httpBatchLink } from '@trpc/client'

import type { TRPCRouter } from './types.ts'

export type AuthHeaderProvider = () =>
  | Promise<Record<string, string | undefined>>
  | Record<string, string | undefined>

export type CreateAppTrpcClientOptions = {
  url: string
  getAuthHeaders?: AuthHeaderProvider
}

export async function buildTrpcAuthHeaders(
  getAuthHeaders?: AuthHeaderProvider,
): Promise<Record<string, string>> {
  if (!getAuthHeaders) {
    return {}
  }

  const headers = await getAuthHeaders()
  return Object.fromEntries(
    Object.entries(headers).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].length > 0,
    ),
  )
}

export function createAppTrpcClient(options: CreateAppTrpcClientOptions) {
  const { url, getAuthHeaders } = options

  return createTRPCClient<TRPCRouter>({
    links: [
      httpBatchLink({
        transformer: superjson,
        url,
        async headers() {
          return buildTrpcAuthHeaders(getAuthHeaders)
        },
      }),
    ],
  })
}
