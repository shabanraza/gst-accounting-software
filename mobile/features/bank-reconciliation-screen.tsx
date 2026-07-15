import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { useLedgerAccounts } from '@/features/use-ledger-accounts'
import { formatInr } from '@/lib/format-inr'
import { currentMonthPeriod } from '@/lib/report-period'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function BankReconciliationScreen() {
  const { companyId } = useWorkspace()
  const ledgersQuery = useLedgerAccounts()
  const period = React.useMemo(() => currentMonthPeriod(), [])

  const statementsQuery = useQuery({
    queryKey: ['bank-statements', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.banking.listStatements.query({
        companyId: companyId!,
      }),
  })

  const bankAccount =
    (ledgersQuery.data ?? []).find((account) => account.systemKey === 'bank') ??
    (ledgersQuery.data ?? []).find((account) => account.systemKey === 'cash')

  const reconciliationQuery = useQuery({
    queryKey: [
      'bank-reconciliation',
      companyId,
      bankAccount?.id,
      period.periodStart,
      period.periodEnd,
    ],
    enabled: Boolean(companyId && bankAccount?.id),
    queryFn: () =>
      trpcClient.banking.getReconciliation.query({
        companyId: companyId!,
        ledgerAccountId: bankAccount!.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      }),
  })

  const isLoading =
    statementsQuery.isLoading ||
    ledgersQuery.isLoading ||
    reconciliationQuery.isLoading

  return (
    <Screen title="Bank reconciliation" subtitle="Match bank statement lines">
      {isLoading ? <LoadingState /> : null}

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
            />
          ))
        )}
      </View>

      {bankAccount ? (
        <View className="gap-section-header">
          <SectionHeader
            title={`${bankAccount.name} · ${period.periodStart}`}
            compact
            icon="card-outline"
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
              {reconciliationQuery.data.rows.slice(0, 8).map((row, index) => (
                <CardRow
                  key={`${row.statementLineId ?? row.bookEntryId ?? index}`}
                  title={row.statementDescription ?? row.bookNarration ?? 'Line'}
                  subtitle={row.statementDate ?? row.bookDate ?? row.status}
                  amount={formatInr(
                    row.statementDebit ??
                      row.statementCredit ??
                      row.bookDebit ??
                      row.bookCredit ??
                      '0',
                  )}
                  badge={row.status}
                />
              ))}
            </>
          ) : null}
        </View>
      ) : (
        <EmptyState message="No bank ledger account configured." />
      )}

      <Text className="text-sm text-muted-foreground">
        CSV import and manual matching are available on web. Mobile shows the
        current reconciliation status.
      </Text>
    </Screen>
  )
}
