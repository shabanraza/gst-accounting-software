import {
  ensureTrpcAuthReady,
  readSessionTokenForAuth,
} from './trpc-auth.ts'
import { trpcClient } from './trpc-client.ts'

export class PostAuthRouteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PostAuthRouteError'
  }
}

function isUnauthorizedError(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const code = (error as { data?: { code?: string } }).data?.code
    if (code === 'UNAUTHORIZED') return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return message.includes('UNAUTHORIZED')
}

export async function resolvePostAuthHref(): Promise<
  '/(app)/(tabs)/dashboard' | '/onboarding'
> {
  await ensureTrpcAuthReady()

  let companies: Array<{ id: string }> = []

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      companies = await trpcClient.companies.list.query()
      break
    } catch (error) {
      if (attempt < 2 && isUnauthorizedError(error)) {
        await ensureTrpcAuthReady()
        continue
      }

      if (isUnauthorizedError(error) && readSessionTokenForAuth()) {
        throw new PostAuthRouteError(
          'Signed in, but workspace access failed. Try signing out and back in.',
        )
      }

      // Match web app.tsx: auth/transient failures should not force onboarding.
      return '/(app)/(tabs)/dashboard'
    }
  }

  if (companies.length === 0) {
    return '/onboarding'
  }

  return '/(app)/(tabs)/dashboard'
}
