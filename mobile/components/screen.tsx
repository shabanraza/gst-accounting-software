import * as React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View, Text, ScrollView, Pressable, TextInput } from '@/tw'
import { getModuleIcon } from '@/lib/module-icons'
import type { MobileNavModule } from '@/lib/nav-config'
import { themeColors } from '@/lib/theme'

const TAB_BAR_HEIGHT = 56

function useScreenInsets() {
  const insets = useSafeAreaInsets()
  return {
    top: insets.top,
    bottom: insets.bottom + TAB_BAR_HEIGHT + 16,
    fabBottom: insets.bottom + TAB_BAR_HEIGHT + 8,
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
        className="border-b border-border bg-background px-page-x pb-dashboard-header-pb"
        style={{ paddingTop: top + 12 }}
      >
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-dashboard-section p-page-x"
        contentContainerStyle={{ paddingBottom: bottom }}
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

export function CardRow({
  title,
  subtitle,
  amount,
  badge,
  onPress,
}: {
  title: string
  subtitle?: string
  amount?: string
  badge?: string
  onPress?: () => void
}) {
  return (
    <Pressable
      className="rounded-xl border border-border bg-card p-card-padding"
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-semibold text-foreground" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          {amount ? (
            <Text className="font-semibold text-foreground" numberOfLines={1}>
              {amount}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color={themeColors.chevron} />
          ) : null}
        </View>
      </View>
      {badge ? (
        <Text className="mt-2 text-caption font-medium uppercase text-primary">
          {badge}
        </Text>
      ) : null}
    </Pressable>
  )
}

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

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8">
      <Text className="text-center text-sm text-muted-foreground">{message}</Text>
    </View>
  )
}

export function LoadingState() {
  return (
    <View className="gap-3">
      <View className="h-20 rounded-xl bg-muted" />
      <View className="h-20 rounded-xl bg-muted" />
      <View className="h-20 rounded-xl bg-muted" />
    </View>
  )
}

export function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className="items-center rounded-xl bg-primary px-4 py-3 disabled:opacity-60"
      disabled={disabled || loading}
      onPress={onPress}
    >
      <Text className="font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      className="items-center rounded-xl border border-border bg-card px-4 py-3"
      onPress={onPress}
    >
      <Text className="font-semibold text-foreground">{label}</Text>
    </Pressable>
  )
}

export function FormField({
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className="rounded-xl border border-border bg-card px-4 py-3 text-foreground"
      placeholderTextColor={themeColors.mutedForeground}
      {...props}
    />
  )
}

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
        contentContainerClassName="flex-grow justify-center gap-4 px-page-x"
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
