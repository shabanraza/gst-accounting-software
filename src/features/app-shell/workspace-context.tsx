import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'

import { WORKSPACE_COMPANY_KEY } from '#/features/app-shell/workspace.ts'
import { trpcClient } from '#/integrations/tanstack-query/root-provider.tsx'
import { authClient } from '#/lib/auth-client.ts'

import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { GodownRecord } from '#/features/inventory/godown-service.ts'

type WorkspaceValue = {
  accountId: string
  companyId: string | null
  company: CompanyRecord | null
  companies: Array<CompanyRecord>
  activeFinancialYearId: string | null
  ledgerBySystemKey: Partial<Record<string, string>>
  godowns: Array<GodownRecord>
  isReady: boolean
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  setActiveCompany: (companyId: string) => Promise<void>
}

const WorkspaceContext = React.createContext<WorkspaceValue | null>(null)

function readPreferredCompanyId() {
  if (typeof window === 'undefined') return undefined
  const value = window.localStorage.getItem(WORKSPACE_COMPANY_KEY)
  if (!value) return undefined
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(value) ? value : undefined
}

function workspaceQueryKey(
  accountId: string,
  preferredCompanyId: string | undefined,
) {
  return ['workspace', accountId, preferredCompanyId ?? 'default'] as const
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: sessionData } = authClient.useSession()
  const accountId = sessionData?.user.id ?? ''
  const [preferredCompanyId, setPreferredCompanyId] = React.useState<
    string | undefined
  >(() => readPreferredCompanyId())

  const workspaceQuery = useQuery({
    queryKey: workspaceQueryKey(accountId, preferredCompanyId),
    queryFn: async () => {
      return trpcClient.companies.ensureWorkspace.mutate({
        preferredCompanyId,
      })
    },
    enabled: Boolean(accountId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  })

  const company = workspaceQuery.data?.company ?? null
  const companies = workspaceQuery.data?.companies ?? []
  const companyId = company?.id ?? null
  const ledgerBySystemKey = workspaceQuery.data?.ledgerBySystemKey ?? {}
  const godowns = workspaceQuery.data?.godowns ?? []
  const activeFinancialYearId =
    workspaceQuery.data?.activeFinancialYearId ?? null
  const isLoading = workspaceQuery.isLoading || workspaceQuery.isFetching
  const isReady = workspaceQuery.isSuccess || workspaceQuery.isError
  const error = workspaceQuery.error
    ? workspaceQuery.error instanceof Error
      ? workspaceQuery.error.message
      : 'Workspace failed to load'
    : null

  React.useEffect(() => {
    if (companyId) {
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, companyId)
    }
  }, [companyId])

  const refresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: workspaceQueryKey(accountId, preferredCompanyId),
    })
  }, [accountId, preferredCompanyId, queryClient])

  const setActiveCompany = React.useCallback(
    async (nextCompanyId: string) => {
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, nextCompanyId)
      setPreferredCompanyId(nextCompanyId)
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(accountId, nextCompanyId),
      })
    },
    [accountId, queryClient],
  )

  const value = React.useMemo<WorkspaceValue>(
    () => ({
      accountId,
      companyId,
      company,
      companies,
      activeFinancialYearId,
      ledgerBySystemKey,
      godowns,
      isReady,
      isLoading,
      error,
      refresh,
      setActiveCompany,
    }),
    [
      accountId,
      companyId,
      company,
      companies,
      activeFinancialYearId,
      ledgerBySystemKey,
      godowns,
      isReady,
      isLoading,
      error,
      refresh,
      setActiveCompany,
    ],
  )

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
