import { Pressable, Text } from '@/tw'

export function PickerField({
  label,
  value,
  placeholder = 'Select…',
  onPress,
}: {
  label: string
  value?: string
  placeholder?: string
  onPress: () => void
}) {
  return (
    <Pressable
      className="rounded-xl border border-border bg-card px-4 py-3"
      onPress={onPress}
    >
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="font-medium text-foreground">{value ?? placeholder}</Text>
    </Pressable>
  )
}
