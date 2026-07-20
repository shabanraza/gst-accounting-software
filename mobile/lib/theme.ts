/**
 * JS color values mirrored from mobile/src/global.css for APIs that cannot use
 * Tailwind classes (Ionicons, React Navigation tab bar, DynamicColorIOS).
 */
export const themeColors = {
  background: '#ffffff',
  foreground: '#111827',
  card: '#ffffff',
  surface: '#f1f5f9',
  surfaceRaised: '#ffffff',
  primary: '#0066f5',
  primaryPressed: '#0052cc',
  primaryMuted: '#eaf2ff',
  primaryForeground: '#ffffff',
  secondary: '#2563eb',
  secondaryMuted: '#eff6ff',
  accentIndigo: '#5145f5',
  accentAmber: '#d97706',
  icon: '#374151',
  iconBg: '#eef2ff',
  metricCardBg: '#ffffff',
  iconAccentSales: '#0066f5',
  iconAccentPurchases: '#0284c7',
  iconAccentStock: '#7c3aed',
  iconAccentReports: '#d97706',
  iconAccentOverdue: '#dc2626',
  mutedForeground: '#64748b',
  subtleForeground: '#94a3b8',
  chevron: '#9ca3af',
  border: '#d8e1ec',
  borderStrong: '#cbd5e1',
  fieldBackground: '#ffffff',
  success: '#047857',
  successMuted: '#ecfdf5',
  warning: '#b45309',
  warningMuted: '#fffbeb',
  destructive: '#dc2626',
  destructiveMuted: '#fef2f2',
  tabActive: '#0066f5',
  tabInactive: '#64748b',
  tabBar: '#ffffff',
  tabBorder: '#d8e1ec',
} as const

export const themeSizes = {
  tabIcon: 22,
  tabLabel: 11,
  sectionIcon: 15,
  actionIcon: 20,
  actionTile: 44,
} as const

export const fontFamilies = {
  regular: 'IBMPlexSans_400Regular',
  semibold: 'IBMPlexSans_600SemiBold',
} as const

export const typography = {
  body: 14,
  label: 12,
  caption: 11,
  button: 14,
  control: 14,
  controlHeight: 48,
  labelFieldGap: 10,
} as const

import { pageLayout, spacing } from './spacing'

/** Mirrors global.css spacing tokens. Prefer inline on Android where custom classes may not apply. */
export const themeSpacing = {
  ...spacing,
  pageX: pageLayout.pageX,
  sectionGap: pageLayout.sectionGap,
  sectionHeaderGap: pageLayout.sectionHeaderGap,
  cardPadding: pageLayout.cardPadding,
} as const

export const pagePaddingHorizontal = {
  paddingHorizontal: pageLayout.pageX,
} as const
