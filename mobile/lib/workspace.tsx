import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { authClient } from './auth-client.ts'
import { WORKSPACE_COMPANY_KEY } from './env.ts'
import { ensureTrpcAuthReady } from './trpc-auth.ts'
import { trpcClient } from './trpc-client.ts'

const COMPANY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type WorkspaceContextValue = {
  companyId: string | null
  companyName: string | null
  companyStateCode: string | null
  companies: Array<{ id: string; tradeName: string }>
  capabilities: Array<string>
  isReady: boolean
  isLoading: boolean
  error: string | null
  needsOnboarding: boolean
  setActiveCompany: (companyId: string) => Promise<void>
  refresh: () => Promise<void>
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

function isValidCompanyId(value: string | null | undefined) {
  return Boolean(value && COMPANY_ID_PATTERN.test(value))
}

async function readPreferredCompanyId() {
  const SecureStore = await import('expo-secure-store')
  const value = await SecureStore.getItemAsync(WORKSPACE_COMPANY_KEY)
  return isValidCompanyId(value) ? value : undefined
}

async function writePreferredCompanyId(companyId: string) {
  const SecureStore = await import('expo-secure-store')
  await SecureStore.setItemAsync(WORKSPACE_COMPANY_KEY, companyId)
}

export async function clearWorkspaceStorage() {
  const SecureStore = await import('expo-secure-store')
  await SecureStore.deleteItemAsync(WORKSPACE_COMPANY_KEY)
}

function workspaceQueryKey(
  accountId: string,
  preferredCompanyId: string | undefined,
) {
  return ['workspace', accountId, preferredCompanyId ?? 'default'] as const
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const accountId = session?.user.id ?? ''
  const [preferredCompanyId, setPreferredCompanyId] = React.useState<
    string | undefined
  >()

  React.useEffect(() => {
    void readPreferredCompanyId().then((value) => {
      if (value) setPreferredCompanyId(value)
    })
  }, [])

  const workspaceQuery = useQuery({
    queryKey: workspaceQueryKey(accountId, preferredCompanyId),
    queryFn: async () => {
      await ensureTrpcAuthReady()
      return trpcClient.companies.ensureWorkspace.mutate({
        preferredCompanyId,
      })
    },
    enabled: Boolean(accountId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const companyId = workspaceQuery.data?.company.id ?? null

  React.useEffect(() => {
    if (companyId) {
      void writePreferredCompanyId(companyId)
    }
  }, [companyId])

  const setActiveCompany = React.useCallback(
    async (nextCompanyId: string) => {
      await writePreferredCompanyId(nextCompanyId)
      setPreferredCompanyId(nextCompanyId)
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(accountId, nextCompanyId),
      })
    },
    [accountId, queryClient],
  )

  const errorMessage = workspaceQuery.error
    ? workspaceQuery.error instanceof Error
      ? workspaceQuery.error.message
      : 'Workspace failed to load'
    : null

  const needsOnboarding =
    Boolean(errorMessage?.includes('No company found')) ||
    (workspaceQuery.isSuccess &&
      (workspaceQuery.data?.companies.length ?? 0) === 0)

  const value: WorkspaceContextValue = {
    companyId,
    companyName: workspaceQuery.data?.company.tradeName ?? null,
    companyStateCode: workspaceQuery.data?.company.stateCode ?? null,
    companies:
      workspaceQuery.data?.companies.map((company) => ({
        id: company.id,
        tradeName: company.tradeName,
      })) ?? [],
    capabilities: workspaceQuery.data?.capabilities ?? [],
    isReady:
      !isSessionPending &&
      (workspaceQuery.isSuccess || workspaceQuery.isError),
    isLoading: isSessionPending || workspaceQuery.isLoading,
    error: errorMessage,
    needsOnboarding,
    setActiveCompany,
    refresh: async () => {
      await workspaceQuery.refetch()
    },
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
