import * as DialogPrimitive from '@rn-primitives/dialog'
import * as React from 'react'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { layout, spacing } from '@/lib/spacing'
import { Text, View } from '@/tw'

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  /** Max height fraction of screen (0–1). Default 0.8 */
  maxHeightRatio?: number
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeightRatio = 0.8,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          closeOnPress
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <DialogPrimitive.Content
            className="rounded-t-3xl bg-background"
            style={{
              maxHeight: `${maxHeightRatio * 100}%`,
              paddingHorizontal: layout.pageX,
              paddingTop: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.lg) + layout.tabBarHeight / 2,
            }}
          >
            <View
              className="flex-row items-start justify-between"
              style={{ marginBottom: spacing.lg }}
            >
              <View className="min-w-0 flex-1 gap-1">
                <DialogPrimitive.Title asChild>
                  <Text className="text-lg font-semibold text-foreground">{title}</Text>
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description asChild>
                    <Text className="text-sm text-muted-foreground">{description}</Text>
                  </DialogPrimitive.Description>
                ) : null}
              </View>
              <DialogPrimitive.Close asChild>
                <Pressable hitSlop={8}>
                  <Text className="text-sm font-medium text-primary">Close</Text>
                </Pressable>
              </DialogPrimitive.Close>
            </View>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
