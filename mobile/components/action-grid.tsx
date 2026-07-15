import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import { Pressable, Text, View } from '@/tw'

const ICON_STROKE = '#374151'

const ACCENT_COLORS = {
  blue: '#2563eb',
  red: '#ef4444',
  orange: '#f97316',
} as const

export type ActionAccent = keyof typeof ACCENT_COLORS

export type ActionGridItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  href: string
  accent?: ActionAccent
}

function ActionIcon({ icon, accent }: { icon: ActionGridItem['icon']; accent?: ActionAccent }) {
  return (
    <View className="relative size-11 items-center justify-center rounded-xl bg-icon-bg">
      <Ionicons name={icon} size={20} color={ICON_STROKE} />
      {accent ? (
        <View
          className="absolute bottom-1.5 right-1.5 size-2 rounded-full"
          style={{ backgroundColor: ACCENT_COLORS[accent] }}
        />
      ) : null}
    </View>
  )
}

export function ActionGrid({ items }: { items: Array<ActionGridItem> }) {
  return (
    <View className="flex-row flex-wrap gap-y-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href as never} asChild>
          <Pressable className="w-1/4 items-center gap-1 px-0.5">
            <ActionIcon icon={item.icon} accent={item.accent} />
            <Text className="text-center text-xs leading-tight text-foreground" numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}
