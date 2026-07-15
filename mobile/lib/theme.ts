/**
 * JS color values mirrored from mobile/src/global.css for APIs that cannot use
 * Tailwind classes (Ionicons, React Navigation tab bar, DynamicColorIOS).
 */
export const themeColors = {
  primary: '#2563eb',
  primaryForeground: '#ffffff',
  icon: '#374151',
  iconAccentBlue: '#2563eb',
  iconAccentRed: '#ef4444',
  iconAccentOrange: '#f97316',
  mutedForeground: '#6b7280',
  chevron: '#9ca3af',
  tabActive: '#2563eb',
  tabInactive: '#6b7280',
  tabBar: '#ffffff',
  tabBorder: '#e5e7eb',
} as const

export const themeSizes = {
  tabIcon: 22,
  tabLabel: 11,
  sectionIcon: 15,
  actionIcon: 20,
  actionTile: 44,
} as const

import { layout, spacing } from './spacing'

/** Mirrors global.css spacing tokens. Prefer inline on Android where custom classes may not apply. */
export const themeSpacing = {
  ...spacing,
  pageX: layout.pageX,
  sectionGap: layout.sectionGap,
  sectionHeaderGap: layout.sectionHeaderGap,
  cardPadding: layout.cardPadding,
} as const

export const pagePaddingHorizontal = {
  paddingHorizontal: layout.pageX,
} as const
