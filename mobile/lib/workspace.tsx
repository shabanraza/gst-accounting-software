import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { authClient } from './auth-client.ts'
import { WORKSPACE_COMPANY_KEY } from './env.ts'
import { trpcClient } from './trpc-client.ts'

type WorkspaceContextValue = {
  companyId: string | null
  companyName: string | null
  companies: Array<{ id: string; tradeName: string }>
  capabilities: Array<string>
  isReady: boolean
  isLoading: boolean
  setActiveCompany: (companyId: string) => Promise<void>
  refresh: () => Promise<void>
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

async function readPreferredCompanyId() {
  const SecureStore = await import('expo-secure-store')
  return SecureStore.getItemAsync(WORKSPACE_COMPANY_KEY) ?? undefined
}

async function writePreferredCompanyId(companyId: string) {
  const SecureStore = await import('expo-secure-store')
  await SecureStore.setItemAsync(WORKSPACE_COMPANY_KEY, companyId)
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [preferredCompanyId, setPreferredCompanyId] = React.useState<
    string | undefined
  >()

  React.useEffect(() => {
    void readPreferredCompanyId().then((value) => {
      if (value) setPreferredCompanyId(value)
    })
  }, [])

  const workspaceQuery = useQuery({
    queryKey: ['workspace', session?.user.id, preferredCompanyId],
    queryFn: () =>
      trpcClient.companies.ensureWorkspace.mutate({
        preferredCompanyId,
      }),
    enabled: Boolean(session?.user.id),
  })

  const setActiveCompany = React.useCallback(
    async (companyId: string) => {
      await writePreferredCompanyId(companyId)
      setPreferredCompanyId(companyId)
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
    [queryClient],
  )

  const value: WorkspaceContextValue = {
    companyId: workspaceQuery.data?.company.id ?? null,
    companyName: workspaceQuery.data?.company.tradeName ?? null,
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
