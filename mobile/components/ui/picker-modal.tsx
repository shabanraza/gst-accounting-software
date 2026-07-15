import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { BottomSheet } from '@/components/ui/dialog'
import { layout } from '@/lib/spacing'
import { View } from '@/tw'

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
    <BottomSheet
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      maxHeightRatio={0.7}
    >
      <View style={{ gap: layout.sectionHeaderGap }}>
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
    </BottomSheet>
  )
}
