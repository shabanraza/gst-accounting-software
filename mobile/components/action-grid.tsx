import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import { Pressable, Text, View } from '@/tw'

export type ActionAccent = 'blue' | 'green' | 'orange' | 'amber' | 'violet'

export type ActionGridItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  accent: ActionAccent
  href: string
}

const accentStyles: Record<ActionAccent, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: '#2563eb' },
  green: { bg: 'bg-emerald-50', icon: '#059669' },
  orange: { bg: 'bg-orange-50', icon: '#ea580c' },
  amber: { bg: 'bg-amber-50', icon: '#d97706' },
  violet: { bg: 'bg-violet-50', icon: '#7c3aed' },
}

export function ActionGrid({ items }: { items: Array<ActionGridItem> }) {
  return (
    <View className="flex-row flex-wrap">
      {items.map((item) => {
        const styles = accentStyles[item.accent]

        return (
          <Link key={item.id} href={item.href as never} asChild>
            <Pressable className="mb-4 w-1/4 items-center gap-1.5 px-1">
              <View
                className={`size-12 items-center justify-center rounded-xl ${styles.bg}`}
              >
                <Ionicons name={item.icon} size={22} color={styles.icon} />
              </View>
              <Text className="text-center text-xs text-gray-700">
                {item.label}
              </Text>
            </Pressable>
          </Link>
        )
      })}
    </View>
  )
}
