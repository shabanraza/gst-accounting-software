import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as React from 'react'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing } from '@/lib/spacing'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'
import { Text, View } from '@/tw'

const BACK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 }

export function StackHeader({
  title,
  subtitle,
  onBack,
  rightAction,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  rightAction?: React.ReactNode
}) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    if (router.canGoBack()) {
      router.back()
    }
  }

  return (
    <View
      className="border-b border-border bg-background pb-dashboard-header-pb"
      style={{ paddingTop: insets.top + spacing.md, ...pagePaddingHorizontal }}
    >
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={handleBack}
          hitSlop={BACK_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="-ml-1 size-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.icon} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? <View className="shrink-0">{rightAction}</View> : null}
      </View>
    </View>
  )
}
