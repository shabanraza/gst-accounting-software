import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { SecondaryButton } from '@/components/ui/button'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { useLedgerAccounts } from '@/features/use-ledger-accounts'
import {
  bankReconRowAmount,
  bankReconStatusLabel,
} from '@/lib/bank-reconciliation'
import { formatInr } from '@/lib/format-inr'
import { currentMonthPeriod } from '@/lib/report-period'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function BankReconciliationScreen() {
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const ledgersQuery = useLedgerAccounts()
  const defaultPeriod = React.useMemo(() => currentMonthPeriod(), [])

  const bankAccounts = React.useMemo(
    () =>
      (ledgersQuery.data ?? []).filter(
        (account) =>
          account.systemKey === 'bank' || account.systemKey === 'cash',
      ),
    [ledgersQuery.data],
  )

  const [ledgerAccountId, setLedgerAccountId] = React.useState('')
  const [statementId, setStatementId] = React.useState<string | undefined>()
  const [periodStart, setPeriodStart] = React.useState(defaultPeriod.periodStart)
  const [periodEnd, setPeriodEnd] = React.useState(defaultPeriod.periodEnd)
  const [accountPickerOpen, setAccountPickerOpen] = React.useState(false)
  const [statementPickerOpen, setStatementPickerOpen] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!ledgerAccountId && bankAccounts[0]) {
      setLedgerAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, ledgerAccountId])

  const statementsQuery = useQuery({
    queryKey: ['bank-statements', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.banking.listStatements.query({
        companyId: companyId!,
      }),
  })

  const accountStatements = React.useMemo(
    () =>
      (statementsQuery.data ?? []).filter(
        (statement) => statement.ledgerAccountId === ledgerAccountId,
      ),
    [ledgerAccountId, statementsQuery.data],
  )

  React.useEffect(() => {
    if (!ledgerAccountId) {
      return
    }

    const latest = [...accountStatements].sort(
      (left, right) =>
        new Date(right.importedAt).getTime() -
        new Date(left.importedAt).getTime(),
    )[0]

    if (!latest) {
      setStatementId(undefined)
      return
    }

    setStatementId(latest.id)
    setPeriodStart(latest.periodStart)
    setPeriodEnd(latest.periodEnd)
  }, [accountStatements, ledgerAccountId])

  const selectedAccount = bankAccounts.find(
    (account) => account.id === ledgerAccountId,
  )
  const selectedStatement = accountStatements.find(
    (statement) => statement.id === statementId,
  )

  const reconciliationQuery = useQuery({
    queryKey: [
      'bank-reconciliation',
      companyId,
      ledgerAccountId,
      periodStart,
      periodEnd,
      statementId,
    ],
    enabled: Boolean(companyId && ledgerAccountId),
    queryFn: () =>
      trpcClient.banking.getReconciliation.query({
        companyId: companyId!,
        ledgerAccountId,
        periodStart,
        periodEnd,
        statementId,
      }),
  })

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !ledgerAccountId || !statementId) {
        throw new Error('Select a bank account and imported statement first.')
      }

      return trpcClient.banking.autoMatch.mutate({
        companyId,
        ledgerAccountId,
        statementId,
        periodStart,
        periodEnd,
      })
    },
    onSuccess: async (result) => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['bank-reconciliation'] })
      setActionError(`Matched ${result.matched} line(s).`)
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : 'Auto-match failed.',
      )
    },
  })

  const isLoading =
    statementsQuery.isLoading ||
    ledgersQuery.isLoading ||
    reconciliationQuery.isLoading

  return (
    <Screen title="Bank reconciliation" subtitle="Match bank statement lines">
      {isLoading ? <LoadingState /> : null}

      <View className="gap-section-header">
        <SectionHeader title="Account & statement" compact icon="card-outline" />
        {bankAccounts.length === 0 ? (
          <EmptyState message="No bank ledger account configured." />
        ) : (
          <>
            <PickerField
              label="Bank / cash account"
              value={
                selectedAccount
                  ? `${selectedAccount.code} · ${selectedAccount.name}`
                  : undefined
              }
              onPress={() => setAccountPickerOpen(true)}
            />
            <PickerField
              label="Imported statement"
              value={selectedStatement?.sourceFilename}
              placeholder="Import CSV on web first"
              onPress={() => setStatementPickerOpen(true)}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <SecondaryButton
                  label={
                    autoMatchMutation.isPending ? 'Matching…' : 'Auto-match'
                  }
                  onPress={() => autoMatchMutation.mutate()}
                />
              </View>
            </View>
            {actionError ? (
              <Text className="text-sm text-muted-foreground">{actionError}</Text>
            ) : null}
          </>
        )}
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Imported statements" compact icon="document-outline" />
        {(statementsQuery.data ?? []).length === 0 ? (
          <EmptyState message="No bank statements imported yet. Import CSV on web." />
        ) : (
          (statementsQuery.data ?? []).map((statement) => (
            <CardRow
              key={statement.id}
              title={statement.sourceFilename}
              subtitle={`${statement.periodStart} to ${statement.periodEnd}`}
              badge="Statement"
              onPress={() => {
                setLedgerAccountId(statement.ledgerAccountId)
                setStatementId(statement.id)
                setPeriodStart(statement.periodStart)
                setPeriodEnd(statement.periodEnd)
              }}
            />
          ))
        )}
      </View>

      {selectedAccount ? (
        <View className="gap-section-header">
          <SectionHeader
            title={`${selectedAccount.name} · ${periodStart}`}
            compact
            icon="swap-horizontal-outline"
          />
          {reconciliationQuery.data ? (
            <>
              <CardRow
                title="Matched"
                amount={String(reconciliationQuery.data.matchedCount)}
              />
              <CardRow
                title="Unmatched statement"
                amount={String(reconciliationQuery.data.unmatchedStatementCount)}
              />
              <CardRow
                title="Unmatched book"
                amount={String(reconciliationQuery.data.unmatchedBookCount)}
              />
              {reconciliationQuery.data.rows.map((row, index) => {
                const { statementAmount, bookAmount } = bankReconRowAmount(row)

                return (
                  <CardRow
                    key={`${row.matchId ?? row.statementLineId ?? row.bookEntryId ?? index}`}
                    title={row.statementDescription ?? row.bookNarration ?? 'Line'}
                    subtitle={row.statementDate ?? row.bookDate ?? undefined}
                    amount={formatInr(
                      Number(statementAmount) > 0
                        ? statementAmount
                        : bookAmount,
                    )}
                    badge={bankReconStatusLabel(row.status)}
                  />
                )
              })}
            </>
          ) : null}
        </View>
      ) : null}

      <Text className="text-sm text-muted-foreground">
        CSV import happens on web. Mobile supports viewing reconciliation and
        running auto-match on imported statements.
      </Text>

      <PickerModal
        visible={accountPickerOpen}
        title="Bank account"
        options={bankAccounts.map((account) => ({
          key: account.id,
          label: `${account.code} · ${account.name}`,
        }))}
        onSelect={setLedgerAccountId}
        onClose={() => setAccountPickerOpen(false)}
      />
      <PickerModal
        visible={statementPickerOpen}
        title="Statement"
        options={accountStatements.map((statement) => ({
          key: statement.id,
          label: statement.sourceFilename,
          description: `${statement.periodStart} to ${statement.periodEnd}`,
        }))}
        onSelect={(nextStatementId) => {
          const statement = accountStatements.find(
            (entry) => entry.id === nextStatementId,
          )
          setStatementId(nextStatementId)
          if (statement) {
            setPeriodStart(statement.periodStart)
            setPeriodEnd(statement.periodEnd)
          }
        }}
        onClose={() => setStatementPickerOpen(false)}
      />
    </Screen>
  )
}
