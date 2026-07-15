import * as React from 'react'
import { TextInput } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { BottomSheet } from '@/components/ui/dialog'
import { pageLayout } from '@/lib/spacing'
import { Text, View } from '@/tw'

export type PickerOption = {
  key: string
  label: string
  description?: string
  keywords?: string
}

export function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = 'Search…',
}: {
  visible: boolean
  title: string
  options: Array<PickerOption>
  onSelect: (key: string) => void
  onClose: () => void
  searchable?: boolean
  searchPlaceholder?: string
}) {
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    if (!visible) {
      setQuery('')
    }
  }, [visible])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions =
    searchable && normalizedQuery
      ? options.filter((option) => {
          const haystack = `${option.label} ${option.description ?? ''} ${option.keywords ?? ''}`
            .toLowerCase()
          return haystack.includes(normalizedQuery)
        })
      : options

  return (
    <BottomSheet
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      maxHeightRatio={0.7}
    >
      <View style={{ gap: pageLayout.sectionHeaderGap }}>
        {searchable ? (
          <TextInput
            className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
            placeholder={searchPlaceholder}
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        {filteredOptions.map((option) => (
          <CardRow
            key={option.key}
            title={option.label}
            subtitle={option.description}
            onPress={() => {
              onSelect(option.key)
              onClose()
            }}
          />
        ))}
        {filteredOptions.length === 0 ? (
          <EmptyState message={options.length === 0 ? 'No options available.' : 'No matches found.'} />
        ) : null}
      </View>
    </BottomSheet>
  )
}
