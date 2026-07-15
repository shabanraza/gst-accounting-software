import { trpcClient } from './trpc-client.ts'

export async function resolvePostAuthHref(): Promise<'/(app)/(tabs)/dashboard' | '/onboarding'> {
  try {
    const companies = await trpcClient.companies.list.query()
    if (companies.length === 0) {
      return '/onboarding'
    }
  } catch {
    return '/onboarding'
  }

  return '/(app)/(tabs)/dashboard'
}
