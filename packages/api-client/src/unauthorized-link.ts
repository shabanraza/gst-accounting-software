import { TRPCClientError } from '@trpc/client'
import { observable } from '@trpc/server/observable'

import type { TRPCLink } from '@trpc/client'

import type { TRPCRouter } from './types.ts'

export function isUnauthorizedTrpcError(error: unknown) {
  if (error instanceof TRPCClientError) {
    return error.data?.code === 'UNAUTHORIZED'
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const code = (error as { data?: { code?: string } }).data?.code
    if (code === 'UNAUTHORIZED') return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return message.includes('UNAUTHORIZED')
}

export function createUnauthorizedLink(
  onUnauthorized?: () => void,
): TRPCLink<TRPCRouter> {
  return () =>
    ({ next, op }) =>
      observable((observer) => {
        const unsubscribe = next(op).subscribe({
          next(value) {
            observer.next(value)
          },
          error(error) {
            if (onUnauthorized && isUnauthorizedTrpcError(error)) {
              onUnauthorized()
            }
            observer.error(error)
          },
          complete() {
            observer.complete()
          },
        })

        return unsubscribe
      })
}
