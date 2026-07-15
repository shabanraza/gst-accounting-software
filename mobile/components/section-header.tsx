import { Ionicons } from '@expo/vector-icons'

import { Text, View } from '@/tw'

export function SectionHeader({
  title,
  subtitle,
  compact = false,
  icon,
}: {
  title: string
  subtitle?: string
  compact?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1.5">
        {icon ? (
          <Ionicons name={icon} size={compact ? 14 : 16} color="#374151" />
        ) : null}
        <Text
          className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text className="text-xs text-muted-foreground">{subtitle}</Text>
      ) : null}
    </View>
  )
}
