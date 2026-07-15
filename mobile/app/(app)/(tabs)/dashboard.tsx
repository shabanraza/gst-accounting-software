import { useQuery } from '@tanstack/react-query'
import { ScrollView, View, Text } from '@/tw'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActionGrid } from '@/components/dashboard/action-grid'
import { BalanceHero } from '@/components/dashboard/balance-hero'
import { DashboardMetricCard } from '@/components/dashboard/dashboard-metric-card'
import { CompanySwitcher } from '@/components/company-switcher'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import {
  QUICK_CREATE_ACTIONS,
  REPORT_ACTIONS,
  VIEW_SHARE_ACTIONS,
} from '@/lib/dashboard-actions'
import { formatInr } from '@/lib/format-inr'
import {
  formatDashboardDate,
  getOverdueCounts,
  mapOwnerSnapshotMetrics,
} from '@/lib/dashboard-metrics'
import { layout, spacing } from '@/lib/spacing'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

function DateRangePill({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5">
      <Ionicons name="calendar-outline" size={11} color={themeColors.primary} />
      <Text className="text-caption font-medium text-muted-foreground">{label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { companyId, companyStateCode } = useWorkspace()
  const insets = useSafeAreaInsets()
  const scrollBottomPadding = insets.bottom + layout.tabBarHeight + spacing.lg
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
  const overdueCounts = snapshot ? getOverdueCounts(snapshot) : null

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between gap-3 border-b border-border bg-background pb-dashboard-header-pb"
        style={{ paddingTop: insets.top + spacing.md, ...pagePaddingHorizontal }}
      >
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
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: scrollBottomPadding,
          gap: layout.sectionGap,
          ...pagePaddingHorizontal,
        }}
        showsVerticalScrollIndicator={false}
      >
        {snapshotQuery.isLoading ? <LoadingState /> : null}

        {snapshot ? (
          <>
            <View style={{ marginHorizontal: -layout.pageX }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: layout.metricCarouselGap,
                  paddingLeft: layout.pageX,
                  paddingRight: layout.pageX,
                }}
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
            </View>

            <BalanceHero
              receivables={formatInr(snapshot.balances.receivableTotal)}
              payables={formatInr(snapshot.balances.payableTotal)}
              overdueInvoiceCount={overdueCounts?.invoices ?? 0}
              overdueBillCount={overdueCounts?.bills ?? 0}
            />

            <View style={{ gap: layout.sectionHeaderGap }}>
              <SectionHeader title="Quick Create" compact icon="flash-outline" />
              <ActionGrid items={QUICK_CREATE_ACTIONS} />
            </View>

            <View style={{ gap: layout.sectionHeaderGap }}>
              <SectionHeader title="View & Share" compact icon="eye-outline" />
              <ActionGrid items={VIEW_SHARE_ACTIONS} />
            </View>

            <View style={{ gap: layout.sectionHeaderGap }}>
              <SectionHeader title="Reports" compact icon="bar-chart-outline" />
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
