import { Ionicons } from '@expo/vector-icons'
import type { ColorValue } from 'react-native'

import { themeColors, themeSizes } from '@/lib/theme'

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: themeColors.tabActive,
  tabBarInactiveTintColor: themeColors.tabInactive,
  tabBarStyle: {
    backgroundColor: themeColors.tabBar,
    borderTopColor: themeColors.tabBorder,
    borderTopWidth: 1,
    height: 56,
    paddingTop: 6,
    paddingBottom: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabelStyle: {
    fontSize: themeSizes.tabLabel,
    fontWeight: '500' as const,
    marginTop: -2,
  },
  tabBarItemStyle: {
    paddingVertical: 2,
  },
}

type TabIconName = keyof typeof Ionicons.glyphMap

export function createTabIcon(outline: TabIconName, filled: TabIconName) {
  return ({
    color,
    focused,
  }: {
    color: ColorValue
    focused: boolean
    size: number
  }) => (
    <Ionicons
      name={focused ? filled : outline}
      color={color}
      size={themeSizes.tabIcon}
    />
  )
}
