import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import { Pressable, Text, View } from '@/tw'
import { getModuleIcon } from '@/lib/module-icons'
import type { MobileNavModule } from '@/lib/nav-config'
import { themeColors } from '@/lib/theme'

export function ModuleLinkCard({ module }: { module: MobileNavModule }) {
  const icon = getModuleIcon(module)

  return (
    <Link href={module.path as never} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-card-padding">
        <View className="size-action-icon shrink-0 items-center justify-center rounded-xl bg-icon-bg">
          <Ionicons name={icon} size={20} color={themeColors.icon} />
        </View>
        <Text className="min-w-0 flex-1 font-semibold text-foreground" numberOfLines={2}>
          {module.title}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={themeColors.chevron} />
      </Pressable>
    </Link>
  )
}
