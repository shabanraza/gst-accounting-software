import * as React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { pagePaddingHorizontal } from '@/lib/theme'

import { Text, ScrollView } from '@/tw'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom } as StyleProp<ViewStyle>}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center gap-4"
        contentContainerStyle={pagePaddingHorizontal}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="text-muted-foreground">{subtitle}</Text>
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
