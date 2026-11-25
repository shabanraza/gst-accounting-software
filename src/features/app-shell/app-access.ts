import type { QueryClient } from '@tanstack/react-query'

export type AppAccess = 'ok' | 'login' | 'onboarding'

const APP_ACCESS_KEY = ['app-access'] as const

/**
 * The /app layout runs this before every page. A granted result is reused for
 * five minutes so page changes do not wait on a session and company round
 * trip each time; a refusal is never remembered, so redirects stay immediate.
 */
export async function ensureAppAccess(
  queryClient: QueryClient,
  deps: {
    hasSession: () => Promise<boolean>
    listCompanies: () => Promise<Array<unknown>>
  },
): Promise<AppAccess> {
  const access = await queryClient.ensureQueryData({
    queryKey: APP_ACCESS_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AppAccess> => {
      if (!(await deps.hasSession())) return 'login'
      const companies = await deps.listCompanies()
      return companies.length === 0 ? 'onboarding' : 'ok'
    },
  })
  if (access !== 'ok') clearAppAccess(queryClient)
  return access
}

export function clearAppAccess(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: APP_ACCESS_KEY })
}
