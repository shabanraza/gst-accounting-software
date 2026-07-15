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
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1.5">
        {icon ? (
          <Ionicons
            name={icon}
            size={compact ? themeSizes.sectionIcon : 16}
            color={themeColors.icon}
          />
        ) : null}
        <Text
          className={`font-semibold text-foreground ${compact ? 'text-section-title' : 'text-base'}`}
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
