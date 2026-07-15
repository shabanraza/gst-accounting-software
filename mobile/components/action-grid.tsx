import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import { Pressable, Text, View } from '@/tw'

export type ActionGridItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  href: string
}

export function ActionGrid({ items }: { items: Array<ActionGridItem> }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <Link key={item.id} href={item.href as never} asChild>
          <Pressable className="w-[30%] min-w-[96px] flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-2 py-4">
            <View className="size-11 items-center justify-center rounded-2xl bg-blue-50">
              <Ionicons name={item.icon} size={22} color="#2563eb" />
            </View>
            <Text className="text-center text-xs font-medium text-gray-800">
              {item.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}
