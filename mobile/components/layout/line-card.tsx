import * as React from 'react'
import { Pressable } from 'react-native'

import { pageLayout } from '@/lib/spacing'
import { Text, View } from '@/tw'

export function LineCard({
  title,
  trailing,
  onRemove,
  canRemove,
  children,
}: {
  title: string
  trailing?: React.ReactNode
  onRemove?: () => void
  canRemove?: boolean
  children: React.ReactNode
}) {
  return (
    <View
      className="gap-3 rounded-xl border border-border bg-card"
      style={{ padding: pageLayout.cardPadding }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-semibold text-foreground">{title}</Text>
        <View className="flex-row items-center gap-3">
          {trailing}
          {canRemove && onRemove ? (
            <Pressable onPress={onRemove}>
              <Text className="text-sm font-medium text-destructive">Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  )
}
