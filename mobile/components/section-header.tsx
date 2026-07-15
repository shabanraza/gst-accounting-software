import { Text, View } from '@/tw'

export function SectionHeader({
  title,
  subtitle,
  compact = false,
}: {
  title: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <View className="gap-0.5">
      <Text
        className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-xs text-muted-foreground">{subtitle}</Text>
      ) : null}
    </View>
  )
}
