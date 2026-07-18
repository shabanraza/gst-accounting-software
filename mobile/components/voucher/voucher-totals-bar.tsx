import { formatInr } from '@/lib/format-inr'
import { Text, View } from '@/tw'

export function DocumentTotalsBar({ total }: { total: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
      <Text className="text-sm text-muted-foreground">Estimated total</Text>
      <Text className="text-base font-semibold tabular-nums">{formatInr(total)}</Text>
    </View>
  )
}

export function VoucherTotalsBar({
  taxableAmount,
  gstAmount,
  grandTotal,
}: {
  taxableAmount: string
  gstAmount: string
  grandTotal: string
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
      <View className="gap-0.5">
        <Text className="text-xs text-muted-foreground">Taxable</Text>
        <Text className="text-base font-medium tabular-nums">
          {formatInr(taxableAmount)}
        </Text>
      </View>
      <View className="gap-0.5">
        <Text className="text-xs text-muted-foreground">GST</Text>
        <Text className="text-base font-medium tabular-nums">
          {formatInr(gstAmount)}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-xs text-muted-foreground">Total</Text>
        <Text className="text-base font-semibold tabular-nums">
          {formatInr(grandTotal)}
        </Text>
      </View>
    </View>
  )
}
