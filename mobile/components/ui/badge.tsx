import { StyleSheet, Text, View } from 'react-native'

import { fontFamilies, themeColors, typography } from '@/lib/theme'

const variantStyles = {
  default: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
    color: themeColors.mutedForeground,
  },
  primary: {
    backgroundColor: themeColors.primaryMuted,
    borderColor: '#bfdbfe',
    color: themeColors.primary,
  },
  success: {
    backgroundColor: themeColors.successMuted,
    borderColor: '#a7f3d0',
    color: themeColors.success,
  },
  warning: {
    backgroundColor: themeColors.warningMuted,
    borderColor: '#fde68a',
    color: themeColors.warning,
  },
  destructive: {
    backgroundColor: themeColors.destructiveMuted,
    borderColor: '#fecaca',
    color: themeColors.destructive,
  },
} as const

export function Badge({
  label,
  variant = 'default',
}: {
  label: string
  variant?: keyof typeof variantStyles
}) {
  const colors = variantStyles[variant]

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor },
      ]}
    >
      <Text style={[styles.text, { color: colors.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function badgeVariantForStatus(status: string): keyof typeof variantStyles {
  const normalized = status.toLowerCase()
  if (
    normalized.includes('paid') ||
    normalized.includes('posted') ||
    normalized.includes('confirmed') ||
    normalized.includes('converted')
  ) {
    return 'success'
  }
  if (
    normalized.includes('draft') ||
    normalized.includes('pending') ||
    normalized.includes('open')
  ) {
    return 'warning'
  }
  if (normalized.includes('cancel') || normalized.includes('reject')) {
    return 'destructive'
  }
  return 'primary'
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    minHeight: 22,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
  },
})
