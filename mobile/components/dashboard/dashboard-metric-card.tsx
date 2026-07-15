import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

import { themeColors } from '@/lib/theme'

export function DashboardMetricCard({
  label,
  amount,
  icon,
  onPress,
}: {
  label: string
  amount: string
  icon: keyof typeof Ionicons.glyphMap
  onPress?: () => void
}) {
  return (
    <Pressable
      className="min-w-[120px] rounded-xl border border-border bg-icon-bg p-card-padding"
      onPress={onPress}
    >
      <View className="mb-2 size-8 items-center justify-center rounded-lg bg-background/80">
        <Ionicons name={icon} size={16} color={themeColors.primary} />
      </View>
      <Text className="text-metric-label font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-0.5 text-base font-bold text-icon-foreground">{amount}</Text>
    </Pressable>
  )
}
