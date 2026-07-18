import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'

import { formatInr } from '@/lib/format-inr'
import { spacing } from '@/lib/spacing'
import { themeColors } from '@/lib/theme'
import { Text, View } from '@/tw'

import type { OwnerSnapshot } from '@/lib/dashboard-metrics'

type SnapshotTile = {
  label: string
  value: string
  helper: string
  accent: string
  backgroundColor: string
  icon: keyof typeof Ionicons.glyphMap
}

function Tile({ item }: { item: SnapshotTile }) {
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: item.backgroundColor, borderColor: `${item.accent}20` },
      ]}
    >
      <View style={styles.tileHeader}>
        <View style={[styles.iconWrap, { backgroundColor: `${item.accent}12` }]}>
          <Ionicons name={item.icon} size={15} color={item.accent} />
        </View>
        <View style={[styles.dot, { backgroundColor: item.accent }]} />
      </View>
      <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
        {item.label}
      </Text>
      <Text
        className="text-base font-bold text-foreground"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {item.value}
      </Text>
      <Text className="text-caption text-muted-foreground" numberOfLines={1}>
        {item.helper}
      </Text>
    </View>
  )
}

export function BusinessSnapshotHero({
  snapshot,
}: {
  snapshot: OwnerSnapshot
}) {
  const tiles: Array<SnapshotTile> = [
    {
      label: 'Sales out',
      value: formatInr(snapshot.monthCompare.current.salesTotal),
      helper: snapshot.monthCompare.currentLabel,
      accent: themeColors.iconAccentSales,
      backgroundColor: themeColors.primaryMuted,
      icon: 'trending-up-outline',
    },
    {
      label: 'Purchases in',
      value: formatInr(snapshot.monthCompare.current.purchaseTotal),
      helper: 'This month',
      accent: themeColors.iconAccentPurchases,
      backgroundColor: themeColors.secondaryMuted,
      icon: 'cart-outline',
    },
    {
      label: 'GST output',
      value: formatInr(snapshot.gstMtd.outputGst),
      helper: 'Tax collected',
      accent: themeColors.iconAccentReports,
      backgroundColor: themeColors.warningMuted,
      icon: 'arrow-up-circle-outline',
    },
    {
      label: 'GST input',
      value: formatInr(snapshot.gstMtd.inputGst),
      helper: 'Input credit',
      accent: themeColors.iconAccentStock,
      backgroundColor: '#eef2ff',
      icon: 'arrow-down-circle-outline',
    },
    {
      label: 'Receivable',
      value: formatInr(snapshot.balances.receivableTotal),
      helper: 'To collect',
      accent: themeColors.primary,
      backgroundColor: '#f0f9ff',
      icon: 'download-outline',
    },
    {
      label: 'Payable',
      value: formatInr(snapshot.balances.payableTotal),
      helper: 'To pay',
      accent: themeColors.iconAccentOverdue,
      backgroundColor: themeColors.destructiveMuted,
      icon: 'wallet-outline',
    },
  ]

  return (
    <View style={styles.container}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground">Business snapshot</Text>
          <Text className="text-sm text-muted-foreground">
            Today + month-to-date
          </Text>
        </View>
        <View style={styles.netSummary}>
          <Text className="text-xs font-medium text-muted-foreground">Net today</Text>
          <Text
            className="text-base font-bold text-foreground"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {formatInr(snapshot.today.netCashFlow)}
          </Text>
        </View>
      </View>

      <View style={styles.todayRow}>
        <View className="min-w-0 flex-1">
          <Text className="text-caption text-muted-foreground">Money in today</Text>
          <Text className="text-base font-bold text-foreground">
            {formatInr(snapshot.today.moneyIn)}
          </Text>
        </View>
        <View style={styles.verticalDivider} />
        <View className="min-w-0 flex-1">
          <Text className="text-caption text-muted-foreground">Money out today</Text>
          <Text className="text-base font-bold text-foreground">
            {formatInr(snapshot.today.moneyOut)}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {tiles.map((item) => (
          <Tile key={item.label} item={item} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  netSummary: {
    maxWidth: 136,
    alignItems: 'flex-end',
    paddingTop: 1,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    backgroundColor: themeColors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: themeColors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48.6%',
    minHeight: 104,
    gap: 3,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
})
