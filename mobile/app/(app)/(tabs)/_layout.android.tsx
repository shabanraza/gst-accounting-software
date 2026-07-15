import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createTabIcon, tabScreenOptions } from '@/lib/tab-bar-options'

export default function TabsLayoutAndroid() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        ...tabScreenOptions,
        tabBarStyle: {
          ...tabScreenOptions.tabBarStyle,
          height: 56 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: createTabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: createTabIcon('cart-outline', 'cart'),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Purchase',
          tabBarIcon: createTabIcon('receipt-outline', 'receipt'),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: createTabIcon('cube-outline', 'cube'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: createTabIcon('grid-outline', 'grid'),
        }}
      />
    </Tabs>
  )
}
