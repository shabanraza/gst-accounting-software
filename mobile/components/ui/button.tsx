import { Pressable, Text } from '@/tw'

export function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className="items-center rounded-xl bg-primary px-4 py-3 disabled:opacity-60"
      disabled={disabled || loading}
      onPress={onPress}
    >
      <Text className="font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      className="items-center rounded-xl border border-border bg-card px-4 py-3"
      onPress={onPress}
    >
      <Text className="font-semibold text-foreground">{label}</Text>
    </Pressable>
  )
}
