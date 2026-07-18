import { Pressable, StyleSheet, Text } from 'react-native'

import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'

type ChipVariant = 'outline' | 'filled'

export function OptionChip({
  label,
  active,
  onPress,
  variant: _variant = 'outline',
}: {
  label: string
  active: boolean
  onPress: () => void
  variant?: ChipVariant
}) {
  const filled = active || _variant === 'filled'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        filled ? styles.filled : styles.outline,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, filled ? styles.filledText : styles.outlineText]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  filled: {
    borderColor: '#bfdbfe',
    backgroundColor: themeColors.primaryMuted,
  },
  outline: {
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    fontFamily: fontFamilies.semibold,
    fontSize: typography.label,
    fontWeight: '600',
  },
  filledText: {
    color: themeColors.primary,
  },
  outlineText: {
    color: themeColors.foreground,
  },
})
