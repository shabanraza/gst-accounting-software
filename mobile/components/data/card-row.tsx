import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Badge, badgeVariantForStatus } from '@/components/ui/badge'
import { pageLayout, spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'
import { Text, View } from '@/tw'

export function CardRow({
  title,
  subtitle,
  amount,
  badge,
  badgeVariant,
  onPress,
}: {
  title: string
  subtitle?: string
  amount?: string
  badge?: string
  badgeVariant?: React.ComponentProps<typeof Badge>['variant']
  onPress?: () => void
}) {
  const resolvedBadgeVariant = badgeVariant ?? (badge ? badgeVariantForStatus(badge) : undefined)

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className="font-semibold text-foreground"
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-sm text-muted-foreground"
              style={styles.subtitle}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          {amount ? (
            <Text
              className="font-semibold text-foreground"
              style={styles.amount}
              numberOfLines={1}
            >
              {amount}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color={themeColors.chevron} />
          ) : null}
        </View>
      </View>
      {badge && resolvedBadgeVariant ? (
        <View style={{ marginTop: spacing.sm }}>
          <Badge label={badge} variant={resolvedBadgeVariant} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.card,
    paddingHorizontal: pageLayout.cardPadding,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.borderStrong,
  },
  title: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
  },
  subtitle: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.label,
    fontWeight: '400',
  },
  amount: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
  },
})
