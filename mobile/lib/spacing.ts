/**
 * Enterprise 8pt spacing scale — single source of truth for layout rhythm.
 * Use inline via themeSpacing on Android where NativeWind custom tokens may not apply.
 */
export const spacing = {
  /** 4px — tight inset */
  xs: 4,
  /** 8px — icon gaps, dense rows */
  sm: 8,
  /** 12px — section title → content */
  md: 12,
  /** 16px — page horizontal padding, card padding */
  lg: 16,
  /** 20px — sub-section spacing */
  xl: 20,
  /** 24px — between major dashboard sections */
  '2xl': 24,
  /** 32px — page header → first block */
  '3xl': 32,
} as const

export const layout = {
  pageX: spacing.lg,
  sectionGap: spacing['2xl'],
  sectionHeaderGap: spacing.md,
  cardPadding: spacing.lg,
  headerBottomGap: spacing.lg,
  metricCarouselGap: spacing.sm,
  balanceHeroGap: spacing.sm,
  actionGridRowGap: spacing.lg,
  tabBarHeight: 56,
} as const
