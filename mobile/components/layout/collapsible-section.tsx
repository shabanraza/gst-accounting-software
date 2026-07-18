import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { fontFamilies, themeColors, typography } from '@/lib/theme'
import { Text, View } from '@/tw'

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  filledCount,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  filledCount?: number
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const label = filledCount ? `${title} (${filledCount})` : title

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.trigger}
        onPress={() => setOpen((current) => !current)}
      >
        <Text className="font-semibold text-foreground" style={styles.label}>
          {label}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={themeColors.chevron}
        />
      </Pressable>
      {open ? <View className="gap-3">{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: typography.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    flex: 1,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
  },
})
