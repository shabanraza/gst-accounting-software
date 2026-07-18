import * as React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { pagePaddingHorizontal } from '@/lib/theme'

import { KeyboardAvoidingView, ScrollView, Text } from '@/tw'

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

  const content = (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center gap-4"
      contentContainerStyle={pagePaddingHorizontal}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-3xl font-bold text-foreground">{title}</Text>
      {subtitle ? (
        <Text className="text-muted-foreground">{subtitle}</Text>
      ) : null}
      {children}
    </ScrollView>
  )

  if (Platform.OS !== 'ios') {
    return <KeyboardAvoidingView className="flex-1 bg-background">{content}</KeyboardAvoidingView>
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior="padding"
      keyboardVerticalOffset={insets.top}
    >
      {content}
    </KeyboardAvoidingView>
  )
}
