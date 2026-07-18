import * as React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  /** Max height fraction of screen (0-1). */
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
  const { height } = useWindowDimensions()
  const maxHeight = height * maxHeightRatio

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
      transparent
      visible={open}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close sheet"
          style={styles.scrim}
          onPress={() => onOpenChange(false)}
        />
        <View
          style={[
            styles.content,
            {
              maxHeight,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}
            </View>
            <Pressable hitSlop={8} onPress={() => onOpenChange(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  content: {
    width: '100%',
    backgroundColor: themeColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: themeColors.borderStrong,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamilies.semibold,
    fontSize: 19,
    fontWeight: '600',
    color: themeColors.foreground,
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: typography.body,
    color: themeColors.mutedForeground,
  },
  close: {
    fontFamily: fontFamilies.semibold,
    fontSize: typography.button,
    fontWeight: '600',
    color: themeColors.primary,
  },
})
