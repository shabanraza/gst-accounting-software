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

function DateRangePill({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
      <Ionicons name="calendar-outline" size={14} color="#2563eb" />
      <Text className="text-xs font-medium text-blue-700">{label}</Text>
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
    <View className="gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <View className="flex-row gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total receivables
          </Text>
          <Text className="text-xl font-bold text-blue-700">{receivables}</Text>
        </View>
        <View className="w-px bg-gray-100" />
        <View className="flex-1 gap-1">
          <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total payables
          </Text>
          <Text className="text-xl font-bold text-amber-700">{payables}</Text>
        </View>
      </View>
      {hasOverdue ? (
        <View className="gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
          <View className="flex-row items-center gap-2">
            <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Overdue
            </Text>
          </View>
          {Number(overdueReceivables) > 0 ? (
            <Text className="text-sm text-amber-900">
              Invoices overdue: {overdueReceivables}
            </Text>
          ) : null}
          {Number(overduePayables) > 0 ? (
            <Text className="text-sm text-amber-900">
              Bills overdue: {overduePayables}
            </Text>
          ) : null}
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
    <View className="flex-1 bg-blue-50/40">
      <View className="border-b border-blue-100 bg-white px-4 pb-4 pt-14">
        <Text className="text-2xl font-bold text-gray-900">Home</Text>
        <Text className="mt-1 text-sm text-gray-500">Business pulse at a glance</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        <CompanySwitcher />
        <DateRangePill
          label={
            snapshot
              ? formatDashboardDate(snapshot.asOfDate)
              : formatDashboardDate(new Date().toISOString().slice(0, 10))
          }
        />

        {snapshotQuery.isLoading ? <LoadingState /> : null}

        {snapshot ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pr-1"
            >
              {mapOwnerSnapshotMetrics(snapshot).map((metric) => (
                <DashboardMetricCard
                  key={metric.id}
                  label={metric.label}
                  amount={formatInr(metric.amount)}
                  icon={metric.icon}
                  tone={metric.tone}
                />
              ))}
            </ScrollView>

            <BalanceSummaryCard
              receivables={formatInr(snapshot.balances.receivableTotal)}
              payables={formatInr(snapshot.balances.payableTotal)}
              overdueReceivables={formatInr(String(overdue?.receivables ?? 0))}
              overduePayables={formatInr(String(overdue?.payables ?? 0))}
            />

            <View className="gap-3">
              <SectionHeader
                title="Quick Create"
                subtitle="Start invoices, receipts, and masters"
              />
              <ActionGrid items={QUICK_CREATE_ACTIONS} />
            </View>

            <View className="gap-3">
              <SectionHeader
                title="View & Share"
                subtitle="Open lists and ledgers"
              />
              <ActionGrid items={VIEW_SHARE_ACTIONS} />
            </View>

            <View className="gap-3">
              <SectionHeader title="Reports" subtitle="GST, journal, and banking" />
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
