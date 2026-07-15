import { Text, View } from '@/tw'

export function StepPills<T extends string>({
  step,
  steps,
}: {
  step: T
  steps: Array<{ id: T; label: string }>
}) {
  return (
    <View className="flex-row gap-2">
      {steps.map((entry) => {
        const active = entry.id === step
        return (
          <View
            key={entry.id}
            className={`rounded-full px-3 py-1 ${active ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text
              className={`text-caption font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {entry.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
