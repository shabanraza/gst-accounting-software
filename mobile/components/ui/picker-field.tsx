import { Ionicons } from '@expo/vector-icons'
import { Keyboard, Pressable, Text, StyleSheet, View } from 'react-native'

import { FormFieldGroup } from '@/components/ui/form-label'
import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'

export function PickerField({
  label,
  value,
  placeholder = 'Select…',
  onPress,
}: {
  label: string
  value?: string
  placeholder?: string
  onPress: () => void
}) {
  return (
    <FormFieldGroup label={label}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.field, pressed ? styles.pressed : null]}
        onPress={() => {
          Keyboard.dismiss()
          onPress()
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
            {value ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={themeColors.chevron} />
        </View>
      </Pressable>
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
