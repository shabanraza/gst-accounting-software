import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'

export function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles.primary,
        pressed && !(disabled || loading) ? styles.primaryPressed : null,
        disabled || loading ? styles.disabled : null,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.primaryForeground} />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles.secondary,
        pressed && !disabled ? styles.secondaryPressed : null,
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: typography.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: themeColors.primary,
  },
  primaryPressed: {
    backgroundColor: themeColors.primaryPressed,
  },
  primaryText: {
    color: themeColors.primaryForeground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.button,
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  secondaryPressed: {
    backgroundColor: themeColors.surface,
  },
  secondaryText: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.button,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.56,
  },
})
