import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

import { Separator } from '@/components/ui/separator'
import { pageLayout, spacing } from '@/lib/spacing'
import { themeColors } from '@/lib/theme'

function BalanceSection({
  label,
  amount,
  onPress,
}: {
  label: string
  amount: string
  onPress?: () => void
}) {
  return (
    <Pressable
      className="flex-1 justify-center"
      style={{ paddingHorizontal: pageLayout.cardPadding, paddingVertical: pageLayout.cardPadding }}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <View className="flex-row items-center justify-between gap-1">
        <Text
          className="min-w-0 flex-1 text-lg font-bold text-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {amount}
        </Text>
        <Ionicons name="chevron-down" size={16} color={themeColors.chevron} />
      </View>
    </Pressable>
  )
}

function OverdueCard({
  count,
  label,
  backgroundClass,
  onPress,
}: {
  count: number
  label: string
  backgroundClass: string
  onPress?: () => void
}) {
  return (
    <Pressable
      className={`min-w-0 flex-1 justify-center rounded-2xl ${backgroundClass}`}
      style={{ paddingHorizontal: pageLayout.cardPadding - 4, paddingVertical: pageLayout.sectionHeaderGap }}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text className="text-3xl font-bold leading-tight text-foreground">{count}</Text>
      <View className="mt-1 flex-row items-end justify-between gap-1">
        <Text className="flex-1 text-xs leading-4 text-muted-foreground" numberOfLines={2}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={themeColors.chevron} />
      </View>
    </Pressable>
  )
}

export function BalanceHero({
  receivables,
  payables,
  overdueInvoiceCount,
  overdueBillCount,
  onReceivablesPress,
  onPayablesPress,
  onOverdueInvoicesPress,
  onOverdueBillsPress,
}: {
  receivables: string
  payables: string
  overdueInvoiceCount: number
  overdueBillCount: number
  onReceivablesPress?: () => void
  onPayablesPress?: () => void
  onOverdueInvoicesPress?: () => void
  onOverdueBillsPress?: () => void
}) {
  return (
    <View
      className="w-full flex-row"
      style={{ gap: pageLayout.balanceHeroGap, minWidth: 0, width: '100%' }}
    >
      <View
        className="overflow-hidden rounded-2xl bg-balance-bg"
        style={{ flex: 58, minWidth: 0, flexShrink: 1 }}
      >
        <BalanceSection
          label="Total Receivables"
          amount={receivables}
          onPress={onReceivablesPress}
        />
        <View style={{ marginHorizontal: pageLayout.cardPadding }}>
          <Separator />
        </View>
        <BalanceSection
          label="Total Payables"
          amount={payables}
          onPress={onPayablesPress}
        />
      </View>

      <View
        className="min-w-0"
        style={{ flex: 42, minWidth: 0, flexShrink: 1, maxWidth: '42%', gap: spacing.sm }}
      >
        <OverdueCard
          count={overdueInvoiceCount}
          label="Overdue Invoices"
          backgroundClass="bg-overdue-invoice-bg"
          onPress={onOverdueInvoicesPress}
        />
        <OverdueCard
          count={overdueBillCount}
          label="Overdue Bills"
          backgroundClass="bg-overdue-bill-bg"
          onPress={onOverdueBillsPress}
        />
      </View>
    </View>
  )
}
