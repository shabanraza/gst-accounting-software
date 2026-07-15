import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

const ICON_COLOR = '#2563eb'

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
      className="min-w-[120px] rounded-xl border border-border bg-icon-bg p-3"
      onPress={onPress}
    >
      <View className="mb-2 size-8 items-center justify-center rounded-lg bg-background/80">
        <Ionicons name={icon} size={16} color={ICON_COLOR} />
      </View>
      <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-0.5 text-base font-bold text-icon-foreground">{amount}</Text>
    </Pressable>
  )
}
