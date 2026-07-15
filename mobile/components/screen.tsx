import * as React from 'react'
import { View, Text, ScrollView, Pressable } from '@/tw'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

import type { MobileNavModule } from '@/lib/nav-config'

export function Screen({
  title,
  subtitle,
  children,
  actionHref,
  actionLabel,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 px-4 pb-3 pt-14">
        <Text className="text-2xl font-bold text-gray-900">{title}</Text>
        {subtitle ? (
          <Text className="text-gray-500 mt-1">{subtitle}</Text>
        ) : null}
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-24">
        {children}
      </ScrollView>
      {actionHref && actionLabel ? (
        <Link href={actionHref as never} asChild>
          <Pressable className="absolute bottom-6 right-4 size-14 items-center justify-center rounded-full bg-blue-600 shadow-lg">
            <Ionicons name="add" size={28} color="white" />
          </Pressable>
        </Link>
      ) : null}
    </View>
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
      className="rounded-xl border border-gray-100 bg-white p-4"
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-gray-900">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-gray-500">{subtitle}</Text>
          ) : null}
        </View>
        {amount ? (
          <Text className="font-semibold text-gray-900">{amount}</Text>
        ) : null}
      </View>
      {badge ? (
        <Text className="text-blue-600 mt-2 text-xs font-medium uppercase">
          {badge}
        </Text>
      ) : null}
    </Pressable>
  )
}

export function ModuleLinkCard({ module }: { module: MobileNavModule }) {
  return (
    <Link href={module.path as never} asChild>
      <Pressable className="rounded-xl border border-gray-100 bg-white p-4">
        <Text className="font-semibold text-gray-900">{module.title}</Text>
      </Pressable>
    </Link>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center rounded-xl border border-dashed border-gray-200 p-8">
      <Text className="text-center text-gray-500">{message}</Text>
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
