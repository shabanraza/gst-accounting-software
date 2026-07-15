import { Ionicons } from '@expo/vector-icons'

import { Text, View } from '@/tw'
import { themeColors, themeSizes } from '@/lib/theme'

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
    <View className="flex-row items-start gap-section-icon-gap">
      <View className="size-section-icon items-center justify-center">
        {icon ? (
          <Ionicons
            name={icon}
            size={compact ? themeSizes.sectionIcon : 16}
            color={themeColors.icon}
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`font-semibold text-foreground ${compact ? 'text-section-title' : 'text-base'}`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  )
}
