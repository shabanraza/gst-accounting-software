import { Text, View } from '@/tw'

import { spacing } from '@/lib/spacing'

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ gap: spacing.md, paddingVertical: spacing.sm }}
    >
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-foreground">
        {value}
      </Text>
    </View>
  )
}
