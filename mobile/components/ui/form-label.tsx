import * as React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { fontFamilies, themeColors, typography } from '@/lib/theme'

export function FormLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>
}

export function FormFieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.group}>
      <FormLabel>{label}</FormLabel>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: typography.labelFieldGap,
  },
  label: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.label,
    fontWeight: '600',
  },
})
