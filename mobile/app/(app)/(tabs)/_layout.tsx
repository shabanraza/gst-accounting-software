import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { DynamicColorIOS, Platform } from 'react-native'

const TAB_TINT =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: '#2563eb', dark: '#3b82f6' })
    : '#2563eb'

export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={TAB_TINT}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sales">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cart', selected: 'cart.fill' }}
          md="shopping_cart"
        />
        <NativeTabs.Trigger.Label>Sales</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="purchases">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'doc.text', selected: 'doc.text.fill' }}
          md="receipt_long"
        />
        <NativeTabs.Trigger.Label>Purchase</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stock">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cube', selected: 'cube.fill' }}
          md="inventory_2"
        />
        <NativeTabs.Trigger.Label>Stock</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more" role="more">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          md="apps"
        />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
