import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

import { Separator } from '@/components/ui/separator'
import { layout, spacing } from '@/lib/spacing'
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
      style={{ paddingHorizontal: layout.cardPadding, paddingVertical: layout.cardPadding }}
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
      className={`flex-1 justify-center rounded-2xl ${backgroundClass}`}
      style={{ paddingHorizontal: layout.cardPadding - 4, paddingVertical: layout.sectionHeaderGap }}
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
    <View className="min-w-0 flex-row" style={{ gap: layout.balanceHeroGap }}>
      <View className="min-w-0 flex-[3] overflow-hidden rounded-2xl bg-balance-bg">
        <BalanceSection
          label="Total Receivables"
          amount={receivables}
          onPress={onReceivablesPress}
        />
        <View style={{ marginHorizontal: layout.cardPadding }}>
          <Separator />
        </View>
        <BalanceSection
          label="Total Payables"
          amount={payables}
          onPress={onPayablesPress}
        />
      </View>

      <View className="min-w-0 flex-[2]" style={{ gap: spacing.sm }}>
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
