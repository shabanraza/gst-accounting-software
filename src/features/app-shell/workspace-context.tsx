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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData } = authClient.useSession()
  const accountId = sessionData?.user.id ?? ''
  const [companyId, setCompanyId] = React.useState<string | null>(() => {
    return readPreferredCompanyId() ?? null
  })
  const [company, setCompany] = React.useState<CompanyRecord | null>(null)
  const [companies, setCompanies] = React.useState<Array<CompanyRecord>>([])
  const [ledgerBySystemKey, setLedgerBySystemKey] = React.useState<
    Partial<Record<string, string>>
  >({})
  const [activeFinancialYearId, setActiveFinancialYearId] = React.useState<
    string | null
  >(null)
  const [godowns, setGodowns] = React.useState<Array<GodownRecord>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isReady, setIsReady] = React.useState(false)

  const applyWorkspace = React.useCallback(
    (data: {
      company: CompanyRecord
      companies: Array<CompanyRecord>
      ledgerBySystemKey: Partial<Record<string, string>>
      godowns?: Array<GodownRecord>
      activeFinancialYearId?: string
    }) => {
      setCompanies(data.companies)
      setCompany(data.company)
      setCompanyId(data.company.id)
      setLedgerBySystemKey(data.ledgerBySystemKey)
      setGodowns(data.godowns ?? [])
      setActiveFinancialYearId(data.activeFinancialYearId ?? null)
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, data.company.id)
      setError(null)
      setIsReady(true)
    },
    [],
  )

  const refresh = React.useCallback(async () => {
    try {
      const data = await trpcClient.companies.ensureWorkspace.mutate({
        preferredCompanyId: readPreferredCompanyId(),
      })
      applyWorkspace(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workspace failed to load')
      setIsReady(true)
    }
  }, [applyWorkspace])

  const setActiveCompany = React.useCallback(
    async (nextCompanyId: string) => {
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, nextCompanyId)
      try {
        const data = await trpcClient.companies.ensureWorkspace.mutate({
          preferredCompanyId: nextCompanyId,
        })
        applyWorkspace(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unable to switch company',
        )
      }
    },
    [applyWorkspace],
  )

  React.useEffect(() => {
    if (!accountId) return
    void refresh()
  }, [accountId, refresh])

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
