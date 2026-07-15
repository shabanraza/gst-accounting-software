import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

const CHEVRON_COLOR = '#9ca3af'

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
      className="flex-1 justify-center gap-1 px-4 py-4"
      onPress={onPress}
      disabled={!onPress}
    >
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xl font-bold text-foreground">{amount}</Text>
        <Ionicons name="chevron-down" size={16} color={CHEVRON_COLOR} />
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
      className={`flex-1 justify-center rounded-2xl px-3 py-3 ${backgroundClass}`}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text className="text-3xl font-bold leading-tight text-foreground">{count}</Text>
      <View className="mt-1 flex-row items-end justify-between gap-1">
        <Text className="flex-1 text-xs leading-4 text-muted-foreground" numberOfLines={2}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={CHEVRON_COLOR} />
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
    <View className="flex-row gap-2">
      <View className="flex-[3] overflow-hidden rounded-2xl bg-balance-bg">
        <BalanceSection
          label="Total Receivables"
          amount={receivables}
          onPress={onReceivablesPress}
        />
        <View className="mx-4 h-px bg-border/60" />
        <BalanceSection
          label="Total Payables"
          amount={payables}
          onPress={onPayablesPress}
        />
      </View>

      <View className="flex-[2] gap-2">
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
