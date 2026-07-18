import DateTimePicker from '@expo/ui/community/datetime-picker'
import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { formatShortDate } from '@/lib/format-inr'
import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'

import { FormFieldGroup } from './form-label'

function parseDateValue(value: string) {
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const date = parseDateValue(value)

  return (
    <FormFieldGroup label={label}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.field, pressed ? styles.pressed : null]}
        onPress={() => {
          Keyboard.dismiss()
          setOpen(true)
        }}
      >
        <View style={styles.row}>
          <Text
            style={[
              styles.text,
              { color: value ? themeColors.foreground : themeColors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {value ? formatShortDate(value) : 'Select date'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={themeColors.chevron} />
        </View>
      </Pressable>
      {open ? (
        <View>
          <DateTimePicker
            accentColor={themeColors.primary}
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            mode="date"
            negativeButton={{ label: 'Cancel' }}
            onDismiss={() => setOpen(false)}
            onValueChange={(_, nextDate) => {
              onChange(formatDateValue(nextDate))
              setOpen(false)
            }}
            positiveButton={{ label: 'OK' }}
            presentation="dialog"
            value={date}
          />
        </View>
      ) : null}
    </FormFieldGroup>
  )
}

const styles = StyleSheet.create({
  field: {
    minHeight: typography.controlHeight,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.fieldBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: themeColors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: typography.control,
    fontWeight: '400',
  },
})
