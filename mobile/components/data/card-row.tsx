import { Ionicons } from '@expo/vector-icons'

import { Pressable, Text, View } from '@/tw'

import { pageLayout, spacing } from '@/lib/spacing'
import { themeColors } from '@/lib/theme'

export function CardRow({
  title,
  subtitle,
  amount,
  badge,
  onPress,
}: {
  title: string
  subtitle?: string
  amount?: string
  badge?: string
  onPress?: () => void
}) {
  return (
    <Pressable
      className="rounded-xl border border-border bg-card"
      style={{ padding: pageLayout.cardPadding }}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-semibold text-foreground" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          {amount ? (
            <Text className="font-semibold text-foreground" numberOfLines={1}>
              {amount}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color={themeColors.chevron} />
          ) : null}
        </View>
      </View>
      {badge ? (
        <Text className="text-caption font-medium uppercase text-primary" style={{ marginTop: spacing.sm }}>
          {badge}
        </Text>
      ) : null}
    </Pressable>
  )
}
