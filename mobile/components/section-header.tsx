import { Text, View } from '@/tw'

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <View className="gap-0.5">
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-gray-500">{subtitle}</Text>
      ) : null}
    </View>
  )
}
