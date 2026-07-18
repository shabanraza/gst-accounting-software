import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import type { ScreenVariant } from '@/lib/navigation'
import { SecondaryButton } from '@/components/ui/button'
import { formatInr } from '@/lib/format-inr'
import { currentMonthPeriod } from '@/lib/report-period'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function ReportSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="gap-section-header">
      <SectionHeader title={title} compact icon={icon} />
      {children}
    </View>
  )
}

export function ReportsScreen({ variant = 'stack' }: { variant?: ScreenVariant }) {
  const { companyId, companyStateCode } = useWorkspace()
  const [periodAnchor, setPeriodAnchor] = React.useState(() => new Date())
  const period = React.useMemo(
    () => currentMonthPeriod(periodAnchor),
    [periodAnchor],
  )

  function shiftPeriod(months: number) {
    setPeriodAnchor((current) => {
      const next = new Date(current)
      next.setMonth(next.getMonth() + months)
      return next
    })
  }

  const trialBalanceQuery = useQuery({
    queryKey: ['reports', 'trial-balance', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.reports.trialBalance.query({
        companyId: companyId!,
      }),
  })

  const profitAndLossQuery = useQuery({
    queryKey: ['reports', 'profit-and-loss', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.reports.profitAndLoss.query({
        companyId: companyId!,
      }),
  })

  const receivablesQuery = useQuery({
    queryKey: ['reports', 'receivables-ageing', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.reports.receivablesAgeing.query({
        companyId: companyId!,
      }),
  })

  const gstr3bQuery = useQuery({
    queryKey: [
      'reports',
      'gstr3b',
      companyId,
      companyStateCode,
      period.periodStart,
      period.periodEnd,
    ],
    enabled: Boolean(companyId && companyStateCode),
    queryFn: () =>
      trpcClient.reports.gstr3b.query({
        companyId: companyId!,
        companyStateCode: companyStateCode!,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      }),
  })

  const gstr1Query = useQuery({
    queryKey: [
      'reports',
      'gstr1',
      companyId,
      companyStateCode,
      period.periodStart,
      period.periodEnd,
    ],
    enabled: Boolean(companyId && companyStateCode),
    queryFn: () =>
      trpcClient.reports.gstr1.query({
        companyId: companyId!,
        companyStateCode: companyStateCode!,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      }),
  })

  const isLoading =
    trialBalanceQuery.isLoading ||
    profitAndLossQuery.isLoading ||
    receivablesQuery.isLoading ||
    gstr3bQuery.isLoading ||
    gstr1Query.isLoading

  const isError =
    trialBalanceQuery.isError ||
    profitAndLossQuery.isError ||
    receivablesQuery.isError ||
    gstr3bQuery.isError ||
    gstr1Query.isError

  const topLedgerRows = (trialBalanceQuery.data ?? [])
    .filter((row) => Number(row.debit) > 0 || Number(row.credit) > 0)
    .slice(0, 6)

  const ageing = receivablesQuery.data

  return (
    <Screen title="GST reports" subtitle="Books and compliance" variant={variant}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm text-muted-foreground">
          {period.periodStart} to {period.periodEnd}
        </Text>
        <View className="flex-row gap-2">
          <SecondaryButton label="Prev" onPress={() => shiftPeriod(-1)} />
          <SecondaryButton label="Next" onPress={() => shiftPeriod(1)} />
        </View>
      </View>

      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <EmptyState message="Unable to load reports. Check your connection." />
      ) : null}

      <ReportSection title="Profit & loss" icon="trending-up-outline">
        {profitAndLossQuery.data ? (
          <>
            <CardRow
              title="Total income"
              amount={formatInr(profitAndLossQuery.data.totalIncome)}
            />
            <CardRow
              title="Total expense"
              amount={formatInr(profitAndLossQuery.data.totalExpense)}
            />
            <CardRow
              title="Net profit"
              amount={formatInr(profitAndLossQuery.data.netProfit)}
              badge="P&L"
            />
          </>
        ) : null}
      </ReportSection>

      <ReportSection title="GSTR-1 summary" icon="document-outline">
        {gstr1Query.data ? (
          <>
            <CardRow
              title="B2B invoices"
              amount={String(gstr1Query.data.b2b.length)}
              badge="GSTR-1"
            />
            <CardRow
              title="Credit / debit notes"
              amount={String(gstr1Query.data.creditDebitNotes.length)}
            />
            <CardRow
              title="Taxable value"
              amount={formatInr(gstr1Query.data.totalTaxableValue)}
            />
            {gstr1Query.data.b2b.slice(0, 4).map((row) => (
              <CardRow
                key={`${row.invoiceNumber}-${row.documentDate}`}
                title={row.partyName}
                subtitle={`${row.invoiceNumber} · ${row.documentDate}`}
                amount={formatInr(row.totalAmount)}
              />
            ))}
          </>
        ) : null}
      </ReportSection>

      <ReportSection title="GSTR-3B summary" icon="document-text-outline">
        {gstr3bQuery.data ? (
          <>
            <CardRow
              title="Outward taxable"
              amount={formatInr(gstr3bQuery.data.outwardTaxableValue)}
            />
            <CardRow
              title="Output GST"
              amount={formatInr(gstr3bQuery.data.outputGst)}
            />
            <CardRow
              title="Input GST"
              amount={formatInr(gstr3bQuery.data.inputGst)}
            />
            <CardRow
              title="Net GST payable"
              amount={formatInr(gstr3bQuery.data.netGstPayable)}
              badge="GSTR-3B"
            />
          </>
        ) : null}
      </ReportSection>

      <ReportSection title="Receivables ageing" icon="time-outline">
        {ageing ? (
          <>
            {Object.entries(ageing.bucketTotals).map(([bucket, total]) => (
              <CardRow
                key={bucket}
                title={`${bucket} days`}
                amount={formatInr(total)}
                badge="Ageing"
              />
            ))}
            {ageing.rows.slice(0, 5).map((row) => (
              <CardRow
                key={`${row.documentNumber}-${row.partyId}`}
                title={row.partyName}
                subtitle={`${row.documentNumber} · ${row.daysOutstanding}d`}
                amount={formatInr(row.outstandingAmount)}
              />
            ))}
            {ageing.rows.length === 0 ? (
              <EmptyState message="No outstanding receivables." />
            ) : null}
          </>
        ) : null}
      </ReportSection>

      <ReportSection title="Trial balance" icon="scale-outline">
        {topLedgerRows.map((row) => (
          <CardRow
            key={row.id}
            title={row.name}
            subtitle={row.code}
            amount={formatInr(
              Number(row.debit) > 0 ? row.debit : row.credit,
            )}
            badge={row.accountType}
          />
        ))}
        {topLedgerRows.length === 0 && !isLoading ? (
          <EmptyState message="No ledger balances yet." />
        ) : null}
      </ReportSection>
    </Screen>
  )
}
