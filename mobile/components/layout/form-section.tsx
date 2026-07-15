import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'

import { SectionHeader } from '@/components/layout/section-header'
import { pageLayout } from '@/lib/spacing'
import { View } from '@/tw'

export function FormSection({
  title,
  icon,
  children,
}: {
  title: string
  icon?: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: pageLayout.sectionHeaderGap }}>
      <SectionHeader title={title} compact icon={icon} />
      <View className="gap-3">{children}</View>
    </View>
  )
}
