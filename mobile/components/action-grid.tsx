import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import { Pressable, Text, View } from '@/tw'

const ICON_COLOR = '#2563eb'

export type ActionGridItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  href: string
}

export function ActionGrid({ items }: { items: Array<ActionGridItem> }) {
  return (
    <View className="flex-row flex-wrap gap-y-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href as never} asChild>
          <Pressable className="w-1/4 items-center gap-1 px-0.5">
            <View className="size-10 items-center justify-center rounded-lg bg-icon-bg">
              <Ionicons name={item.icon} size={18} color={ICON_COLOR} />
            </View>
            <Text className="text-center text-xs text-foreground" numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}
