import { Text, View } from '@/tw'

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8">
      <Text className="text-center text-sm text-muted-foreground">{message}</Text>
    </View>
  )
}
