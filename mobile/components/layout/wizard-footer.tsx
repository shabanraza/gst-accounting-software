import * as React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing } from '@/lib/spacing'
import { pagePaddingHorizontal } from '@/lib/theme'
import { View } from '@/tw'

export function WizardFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="border-t border-border bg-background"
      style={{
        paddingTop: spacing.md,
        paddingBottom: insets.bottom + spacing.md,
        gap: spacing.md,
        ...pagePaddingHorizontal,
      }}
    >
      {children}
    </View>
  )
}
