import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'

import { themeColors } from '@/lib/theme'
import { Text } from '@/tw'

export function AddLineButton({
  label = 'Add line',
  onPress,
}: {
  label?: string
  onPress: () => void
}) {
  return (
    <Pressable
      className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary bg-primary/5 px-4 py-3"
      onPress={onPress}
    >
      <Ionicons name="add-circle-outline" size={20} color={themeColors.primary} />
      <Text className="font-semibold text-primary">{label}</Text>
    </Pressable>
  )
}
