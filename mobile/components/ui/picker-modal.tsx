import * as React from 'react'
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { BottomSheet } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { useFormPickerOpenRegistration } from '@/lib/form-picker-coordination'
import { pageLayout, spacing } from '@/lib/spacing'
import { View } from '@/tw'

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
  const { height } = useWindowDimensions()
  const listMaxHeight = Math.max(160, height * 0.42)
  useFormPickerOpenRegistration(visible)

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
      maxHeightRatio={0.75}
    >
      <View style={styles.content}>
        {searchable ? (
          <FormField
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        <FlatList
          data={filteredOptions}
          style={[styles.list, { maxHeight: listMaxHeight }]}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(option) => option.key}
          ListEmptyComponent={
            <EmptyState
              message={
                options.length === 0 ? 'No options available.' : 'No matches found.'
              }
            />
          }
          nestedScrollEnabled
          renderItem={({ item: option }) => (
            <CardRow
              title={option.label}
              subtitle={option.description}
              onPress={() => {
                onSelect(option.key)
                onClose()
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: pageLayout.sectionHeaderGap,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
})
