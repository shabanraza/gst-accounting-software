import { useQuery } from '@tanstack/react-query'
import { ScrollView, View, Text } from '@/tw'
import { Ionicons } from '@expo/vector-icons'

import { ActionGrid } from '@/components/action-grid'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { CompanySwitcher } from '@/components/company-switcher'
import { SectionHeader } from '@/components/section-header'
import { EmptyState, LoadingState } from '@/components/screen'
import {
  QUICK_CREATE_ACTIONS,
  REPORT_ACTIONS,
  VIEW_SHARE_ACTIONS,
} from '@/lib/dashboard-actions'
import { formatInr } from '@/lib/format-inr'
import {
  formatDashboardDate,
  getOverdueTotals,
  mapOwnerSnapshotMetrics,
} from '@/lib/dashboard-metrics'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

const PRIMARY_COLOR = '#2563eb'

function DateRangePill({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5">
      <Ionicons name="calendar-outline" size={11} color={PRIMARY_COLOR} />
      <Text className="text-[10px] font-medium text-muted-foreground">{label}</Text>
    </View>
  )
}

function BalanceSummaryCard({
  receivables,
  payables,
  overdueReceivables,
  overduePayables,
}: {
  receivables: string
  payables: string
  overdueReceivables: string
  overduePayables: string
}) {
  const hasOverdue =
    Number(overdueReceivables) > 0 || Number(overduePayables) > 0

  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-3">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Receivables
          </Text>
          <Text className="text-base font-bold text-icon-foreground">
            {receivables}
          </Text>
        </View>
        <View className="w-px bg-border" />
        <View className="flex-1 gap-0.5">
          <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Payables
          </Text>
          <Text className="text-base font-bold text-icon-foreground">
            {payables}
          </Text>
        </View>
      </View>
      {hasOverdue ? (
        <View className="flex-row items-center gap-1.5 rounded-lg bg-warning-muted px-2 py-1.5">
          <Ionicons name="alert-circle-outline" size={13} color="#d97706" />
          <Text className="flex-1 text-[10px] text-warning-foreground">
            {Number(overdueReceivables) > 0
              ? `Invoices overdue: ${overdueReceivables}`
              : null}
            {Number(overdueReceivables) > 0 && Number(overduePayables) > 0
              ? ' · '
              : null}
            {Number(overduePayables) > 0
              ? `Bills overdue: ${overduePayables}`
              : null}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default function DashboardScreen() {
  const { companyId, companyStateCode } = useWorkspace()
  const snapshotQuery = useQuery({
    queryKey: ['dashboard', companyId, companyStateCode],
    enabled: Boolean(companyId && companyStateCode),
    queryFn: () =>
      trpcClient.dashboard.getOwnerSnapshot.query({
        companyId: companyId!,
        companyStateCode: companyStateCode!,
      }),
  })

  const snapshot = snapshotQuery.data
  const overdue = snapshot ? getOverdueTotals(snapshot) : null

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between gap-3 border-b border-border bg-background px-4 pb-2 pt-14">
        <CompanySwitcher variant="header" />
        <DateRangePill
          label={
            snapshot
              ? formatDashboardDate(snapshot.asOfDate)
              : formatDashboardDate(new Date().toISOString().slice(0, 10))
          }
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 p-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {snapshotQuery.isLoading ? <LoadingState /> : null}

        {snapshot ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pr-1"
            >
              {mapOwnerSnapshotMetrics(snapshot).map((metric) => (
                <DashboardMetricCard
                  key={metric.id}
                  label={metric.label}
                  amount={formatInr(metric.amount)}
                  icon={metric.icon}
                />
              ))}
            </ScrollView>

            <BalanceSummaryCard
              receivables={formatInr(snapshot.balances.receivableTotal)}
              payables={formatInr(snapshot.balances.payableTotal)}
              overdueReceivables={formatInr(String(overdue?.receivables ?? 0))}
              overduePayables={formatInr(String(overdue?.payables ?? 0))}
            />

            <View className="gap-1.5">
              <SectionHeader title="Quick Create" compact />
              <ActionGrid items={QUICK_CREATE_ACTIONS} />
            </View>

            <View className="gap-1.5">
              <SectionHeader title="View & Share" compact />
              <ActionGrid items={VIEW_SHARE_ACTIONS} />
            </View>

            <View className="gap-1.5">
              <SectionHeader title="Reports" compact />
              <ActionGrid items={REPORT_ACTIONS} />
            </View>
          </>
        ) : null}

        {!snapshotQuery.isLoading && !snapshot ? (
          <EmptyState message="Dashboard metrics will appear once your company is ready." />
        ) : null}
      </ScrollView>
    </View>
  )
}
