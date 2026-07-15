import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'

import { SectionHeader } from '@/components/layout/section-header'
import { View } from '@/tw'

export function DetailCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="gap-section-header">
      <SectionHeader title={title} compact icon={icon} />
      <View className="rounded-xl border border-border bg-card p-card-padding">
        {children}
      </View>
    </View>
  )
}
