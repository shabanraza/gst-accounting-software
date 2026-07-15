import { Text, View } from '@/tw'

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-foreground">
        {value}
      </Text>
    </View>
  )
}
