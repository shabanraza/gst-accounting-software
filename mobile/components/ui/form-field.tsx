import * as React from 'react'
import { StyleSheet } from 'react-native'

import { useFormPickerDismissOnFocus } from '@/lib/form-picker-coordination'
import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'
import { TextInput } from '@/tw'

import { fieldControlClassName } from './field-styles'

export function FormField({
  onFocus,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  const pickerContext = useFormPickerDismissOnFocus()
  const [focused, setFocused] = React.useState(false)

  return (
    <TextInput
      {...props}
      className={`${fieldControlClassName} text-foreground`}
      placeholderTextColor={themeColors.mutedForeground}
      selectionColor={themeColors.primary}
      style={[
        styles.field,
        props.multiline ? styles.multiline : null,
        focused ? styles.focused : null,
        props.style,
      ]}
      onFocus={(event) => {
        setFocused(true)
        pickerContext?.dismissOnFocus()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        props.onBlur?.(event)
      }}
    />
  )
}

const styles = StyleSheet.create({
  field: {
    minHeight: typography.controlHeight,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.fieldBackground,
    color: themeColors.foreground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.control,
    fontWeight: '400',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  focused: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.card,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
})
