import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenIcon, WalletCardsIcon } from 'lucide-react'

import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type {
  LedgerAccountRecord,
  LedgerAccountType,
} from '#/features/accounting/chart-of-accounts.ts'

import { accountTypeBadgeIntent } from '#/lib/badge-intent.ts'

type AccountTypeFilter = 'all' | LedgerAccountType

const accountTypeTabs: Array<{ value: AccountTypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

function formatAccountType(accountType: LedgerAccountType) {
  return accountType.charAt(0).toUpperCase() + accountType.slice(1)
}

export function ChartOfAccountsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company, isReady, refresh } = useWorkspace()
  const [typeFilter, setTypeFilter] = React.useState<AccountTypeFilter>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  const accountsQuery = useQuery({
    ...trpc.accounting.listLedgerAccounts.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const setupChart = useMutation(
    trpc.accounting.setupChartOfAccounts.mutationOptions(),
  )

  const accounts = accountsQuery.data ?? []

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredAccounts = accounts
    .filter((account) => {
      if (typeFilter !== 'all' && account.accountType !== typeFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        account.name.toLowerCase().includes(normalizedQuery) ||
        account.code.toLowerCase().includes(normalizedQuery)
      )
    })
    .sort((left, right) => left.code.localeCompare(right.code))

  const typeCounts: Record<AccountTypeFilter, number> = {
    all: accounts.length,
    asset: 0,
    liability: 0,
    equity: 0,
    income: 0,
    expense: 0,
  }

  for (const account of accounts) {
    typeCounts[account.accountType] += 1
  }

  async function handleSetupDefaultAccounts() {
    if (!companyId || !company) {
      toast.error('Workspace is still loading. Try again in a moment.')
      return
    }

    try {
      await setupChart.mutateAsync({
        companyId,
        businessType: company.businessType,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.accounting.listLedgerAccounts.queryKey({ companyId }),
      })
      await refresh()
      setTypeFilter('all')
      setSearchQuery('')
    } catch (err) {
      toastActionError(err, 'Failed to set up chart of accounts')
    }
  }

  const hasAccounts = accounts.length > 0
  const hasFilteredResults = filteredAccounts.length > 0
  const isLoading = accountsQuery.isLoading || !isReady

  return (
    <WorkspacePage
      description="Company ledgers used for posting sales, purchases, GST, and cash movements."
      title="Chart of accounts"
    >
      {isLoading ? (
        <Card className="flex flex-1 items-center justify-center">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Loading ledgers…
          </CardContent>
        </Card>
      ) : !hasAccounts ? (
        <Card className="flex flex-1 items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <WalletCardsIcon />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium">No ledgers yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Set up the default trading chart to create cash, bank, GST,
                sales, purchase, and stock ledgers.
              </p>
            </div>
            <Button
              disabled={setupChart.isPending}
              onClick={handleSetupDefaultAccounts}
            >
              <BookOpenIcon data-icon="inline-start" />
              Set up default accounts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="gap-4 border-b py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Ledgers</CardTitle>
                <CardDescription>
                  {accounts.length} accounts ·{' '}
                  {company?.businessType ?? 'company'}
                </CardDescription>
              </div>
              <SearchInput
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or code"
                value={searchQuery}
                wrapperClassName="w-full max-w-xs"
              />
            </div>
            <Tabs
              onValueChange={(value) =>
                setTypeFilter(value as AccountTypeFilter)
              }
              value={typeFilter}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start">
                {accountTypeTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                    <Badge className="ml-1.5" variant="neutral">
                      {typeCounts[tab.value]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {hasFilteredResults ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-28 pl-6">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-36">Type</TableHead>
                    <TableHead className="w-28 pr-6">System</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account: LedgerAccountRecord) => (
                    <TableRow key={account.id}>
                      <TableCell className="pl-6 font-mono tabular-nums text-muted-foreground">
                        {account.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {account.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={accountTypeBadgeIntent(account.accountType)}
                        >
                          {formatAccountType(account.accountType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        {account.isSystem ? (
                          <Badge variant="neutral">System</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="text-sm font-medium">No matching ledgers</p>
                <p className="text-sm text-muted-foreground">
                  Try a different type tab or clear the search.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </WorkspacePage>
  )
}
