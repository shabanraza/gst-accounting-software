import * as React from 'react'

import { TextInput } from '@/tw'
import { themeColors } from '@/lib/theme'

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
