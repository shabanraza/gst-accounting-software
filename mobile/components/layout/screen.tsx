import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import * as React from 'react'
import { FlatList, Platform, type FlatListProps } from 'react-native'
import { KeyboardAvoidingView } from '@/tw'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { StackHeader } from '@/components/layout/stack-header'
import {
  FormPickerScope,
  useFormPickerContext,
} from '@/lib/form-picker-coordination'
import { shouldShowBackButton, type ScreenVariant } from '@/lib/navigation'
import { pageLayout, spacing } from '@/lib/spacing'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'
import { View, Text, ScrollView, Pressable } from '@/tw'

function useScreenInsets(hasFooter: boolean) {
  const insets = useSafeAreaInsets()
  return {
    top: insets.top,
    bottom: hasFooter
      ? spacing.lg
      : insets.bottom + pageLayout.tabBarHeight + spacing.lg,
    fabBottom: insets.bottom + pageLayout.tabBarHeight + spacing.sm,
  }
}

function TabHeader({
  title,
  subtitle,
  topInset,
}: {
  title: string
  subtitle?: string
  topInset: number
}) {
  return (
    <View
      className="bg-background pb-dashboard-header-pb"
      style={{ paddingTop: topInset + spacing.md, ...pagePaddingHorizontal }}
    >
      <Text className="text-2xl font-bold text-foreground">{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
      ) : null}
    </View>
  )
}

function ScreenBody({
  title,
  subtitle,
  children,
  actionHref,
  actionLabel,
  keyboardAvoiding = false,
  variant = 'stack',
  showBack,
  onBack,
  headerRight,
  headerTone = 'plain',
  headerContent,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  actionHref?: string
  actionLabel?: string
  keyboardAvoiding?: boolean
  variant?: ScreenVariant
  showBack?: boolean
  onBack?: () => void
  headerRight?: React.ReactNode
  headerTone?: 'plain' | 'brand'
  headerContent?: React.ReactNode
  footer?: React.ReactNode
}) {
  const pickerContext = useFormPickerContext()
  const hideFooter = Boolean(footer) && Boolean(pickerContext?.anyPickerOpen)
  const { top, bottom, fabBottom } = useScreenInsets(Boolean(footer) && !hideFooter)
  const showBackButton = shouldShowBackButton(variant, showBack)

  const content = (
    <View className="flex-1 bg-background">
      {showBackButton ? (
        <StackHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          rightAction={headerRight}
          tone={headerTone}
        >
          {headerContent}
        </StackHeader>
      ) : (
        <TabHeader title={title} subtitle={subtitle} topInset={top} />
      )}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: spacing.lg,
          paddingBottom: bottom,
          gap: pageLayout.sectionGap,
          ...pagePaddingHorizontal,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer && !hideFooter ? (
        <View style={{ flexShrink: 0 }}>{footer}</View>
      ) : null}
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

  // Android `height` behavior collapses stack wizard screens to a blank view.
  if (!keyboardAvoiding || Platform.OS !== 'ios') {
    return content
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior="padding">
      {content}
    </KeyboardAvoidingView>
  )
}

export function Screen(props: React.ComponentProps<typeof ScreenBody>) {
  if (!props.footer) {
    return <ScreenBody {...props} />
  }

  return (
    <FormPickerScope>
      <ScreenBody {...props} />
    </FormPickerScope>
  )
}

type ListScreenProps<ItemT> = Omit<
  FlatListProps<ItemT>,
  'contentContainerStyle'
> & {
  title: string
  subtitle?: string
  variant?: ScreenVariant
  showBack?: boolean
  onBack?: () => void
  headerRight?: React.ReactNode
  actionHref?: string
  actionLabel?: string
  contentGap?: number
  contentContainerStyle?: FlatListProps<ItemT>['contentContainerStyle']
}

export function ListScreen<ItemT>({
  title,
  subtitle,
  variant = 'stack',
  showBack,
  onBack,
  headerRight,
  actionHref,
  actionLabel,
  contentGap = pageLayout.sectionHeaderGap,
  contentContainerStyle,
  ...flatListProps
}: ListScreenProps<ItemT>) {
  const { top, bottom, fabBottom } = useScreenInsets(false)
  const showBackButton = shouldShowBackButton(variant, showBack)

  return (
    <View className="flex-1 bg-background">
      {showBackButton ? (
        <StackHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          rightAction={headerRight}
        />
      ) : (
        <TabHeader title={title} subtitle={subtitle} topInset={top} />
      )}
      <FlatList
        {...flatListProps}
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingTop: spacing.lg,
            paddingBottom: bottom,
            gap: contentGap,
            ...pagePaddingHorizontal,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
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
}
