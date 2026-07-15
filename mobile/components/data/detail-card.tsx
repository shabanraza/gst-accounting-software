import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'

import { SectionHeader } from '@/components/layout/section-header'
import { pageLayout } from '@/lib/spacing'
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
    <View style={{ gap: pageLayout.sectionHeaderGap }}>
      <SectionHeader title={title} compact icon={icon} />
      <View
        className="rounded-xl border border-border bg-card"
        style={{ padding: pageLayout.cardPadding }}
      >
        {children}
      </View>
    </View>
  )
}
