import { Modal, Pressable } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { pagePaddingHorizontal, themeSpacing } from '@/lib/theme'
import { Text, View } from '@/tw'

export type PickerOption = {
  key: string
  label: string
}

export function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: Array<PickerOption>
  onSelect: (key: string) => void
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[70%] rounded-t-3xl bg-background pb-page-bottom"
          style={{
            paddingHorizontal: themeSpacing.pageX,
            paddingTop: themeSpacing.pageX,
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{title}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {options.map((option) => (
              <CardRow
                key={option.key}
                title={option.label}
                onPress={() => {
                  onSelect(option.key)
                  onClose()
                }}
              />
            ))}
            {options.length === 0 ? (
              <EmptyState message="No options available." />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  )
}
