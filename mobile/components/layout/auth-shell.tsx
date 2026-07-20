import * as React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HisaabKroMascot } from '@/components/brand/hisaabkro-mascot'
import { pagePaddingHorizontal } from '@/lib/theme'

import { KeyboardAvoidingView, ScrollView, Text, View } from '@/tw'

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
      <View className="items-center gap-2">
        <HisaabKroMascot />
        <Text className="text-center text-3xl font-bold text-foreground">
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text className="text-center text-muted-foreground">{subtitle}</Text>
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
