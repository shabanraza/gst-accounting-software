import { useQuery } from '@tanstack/react-query'
import { ScrollView, View, Text } from '@/tw'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActionGrid } from '@/components/dashboard/action-grid'
import { BusinessSnapshotHero } from '@/components/dashboard/business-snapshot-hero'
import { CompanySwitcher } from '@/components/company-switcher'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import {
  QUICK_CREATE_ACTIONS,
  REPORT_ACTIONS,
  VIEW_SHARE_ACTIONS,
} from '@/lib/dashboard-actions'
import { formatDashboardDate } from '@/lib/dashboard-metrics'
import { pageLayout, spacing } from '@/lib/spacing'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

function DateRangePill({ label }: { label: string }) {
  return (
    <View
      className="flex-row items-center gap-1"
      style={styles.datePill}
    >
      <Ionicons name="calendar-outline" size={14} color={themeColors.secondary} />
      <Text className="text-base font-semibold text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { companyId, companyStateCode } = useWorkspace()
  const insets = useSafeAreaInsets()
  const scrollBottomPadding = insets.bottom + pageLayout.tabBarHeight + spacing.lg
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

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between gap-3 bg-background pb-dashboard-header-pb"
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
          gap: pageLayout.sectionGap,
          ...pagePaddingHorizontal,
        }}
        showsVerticalScrollIndicator={false}
      >
        {snapshotQuery.isLoading ? <LoadingState /> : null}

        {snapshot ? (
          <>
            <BusinessSnapshotHero snapshot={snapshot} />

            <View style={{ gap: pageLayout.sectionHeaderGap }}>
              <SectionHeader title="Quick Create" compact icon="flash-outline" />
              <ActionGrid items={QUICK_CREATE_ACTIONS} />
            </View>

            <View style={{ gap: pageLayout.sectionHeaderGap }}>
              <SectionHeader title="View & Share" compact icon="eye-outline" />
              <ActionGrid items={VIEW_SHARE_ACTIONS} />
            </View>

            <View style={{ gap: pageLayout.sectionHeaderGap }}>
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

const styles = StyleSheet.create({
  datePill: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
})
