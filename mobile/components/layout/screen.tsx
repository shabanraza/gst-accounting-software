import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import * as React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View, Text, ScrollView, Pressable } from '@/tw'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'
import { layout, spacing } from '@/lib/spacing'

function useScreenInsets() {
  const insets = useSafeAreaInsets()
  return {
    top: insets.top,
    bottom: insets.bottom + layout.tabBarHeight + spacing.lg,
    fabBottom: insets.bottom + layout.tabBarHeight + spacing.sm,
  }
}

export function Screen({
  title,
  subtitle,
  children,
  actionHref,
  actionLabel,
  keyboardAvoiding = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  actionHref?: string
  actionLabel?: string
  keyboardAvoiding?: boolean
}) {
  const { top, bottom, fabBottom } = useScreenInsets()

  const content = (
    <View className="flex-1 bg-background">
      <View
        className="border-b border-border bg-background pb-dashboard-header-pb"
        style={{ paddingTop: top + spacing.md, ...pagePaddingHorizontal }}
      >
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: bottom,
          gap: layout.sectionGap,
          ...pagePaddingHorizontal,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {actionHref && actionLabel ? (
        <Link href={actionHref as never} asChild>
          <Pressable
            className="absolute right-4 size-14 items-center justify-center rounded-full bg-primary"
            style={{ bottom: fabBottom }}
          >
            <Ionicons name="add" size={28} color={themeColors.primaryForeground} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  )

  if (!keyboardAvoiding) {
    return content
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={top}
    >
      {content}
    </KeyboardAvoidingView>
  )
}
