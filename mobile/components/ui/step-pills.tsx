import { StyleSheet } from 'react-native'

import { fontFamilies, themeColors, typography } from '@/lib/theme'
import { Text, View } from '@/tw'

export function StepPills<T extends string>({
  step,
  steps,
  tone = 'plain',
}: {
  step: T
  steps: Array<{ id: T; label: string }>
  tone?: 'plain' | 'brand'
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((entry) => entry.id === step),
  )
  const isBrand = tone === 'brand'

  return (
    <View className="flex-row items-start">
      {steps.map((entry, index) => {
        const active = entry.id === step
        const complete = index < activeIndex
        return (
          <View
            key={entry.id}
            className="flex-1 items-center"
          >
            <View className="w-full flex-row items-center">
              <View className="flex-1" style={index === 0 ? styles.hiddenLine : [
                styles.line,
                isBrand ? styles.brandLine : styles.plainLine,
                complete || active ? (isBrand ? styles.brandActiveLine : styles.plainActiveLine) : null,
              ]} />
              <View
                style={[
                  styles.dot,
                  isBrand ? styles.brandDot : styles.plainDot,
                  active ? (isBrand ? styles.brandDotActive : styles.plainDotActive) : null,
                  complete ? (isBrand ? styles.brandDotComplete : styles.plainDotActive) : null,
                ]}
              >
                <Text
                  style={[
                    styles.number,
                    isBrand
                      ? active
                        ? styles.brandNumberActive
                        : styles.brandNumber
                      : active || complete
                        ? styles.plainNumberActive
                        : styles.numberPlain,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View className="flex-1" style={index === steps.length - 1 ? styles.hiddenLine : [
                styles.line,
                isBrand ? styles.brandLine : styles.plainLine,
                complete ? (isBrand ? styles.brandActiveLine : styles.plainActiveLine) : null,
              ]} />
            </View>
            <Text
              style={[
                styles.label,
                isBrand ? styles.brandLabel : styles.plainLabel,
                active ? (isBrand ? styles.brandLabelActive : styles.plainLabelActive) : null,
              ]}
              numberOfLines={1}
            >
              {entry.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  line: {
    height: 1,
  },
  hiddenLine: {
    flex: 1,
    height: 1,
    opacity: 0,
  },
  plainLine: {
    backgroundColor: themeColors.border,
  },
  brandLine: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  plainActiveLine: {
    backgroundColor: themeColors.primary,
  },
  brandActiveLine: {
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  dot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  plainDot: {
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  plainDotActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  brandDot: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  brandDotActive: {
    borderColor: themeColors.primaryForeground,
    backgroundColor: themeColors.primaryForeground,
  },
  brandDotComplete: {
    borderColor: 'rgba(255,255,255,0.86)',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  number: {
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  numberPlain: {
    color: themeColors.mutedForeground,
  },
  plainNumberActive: {
    color: themeColors.primary,
  },
  brandNumber: {
    color: themeColors.primaryForeground,
  },
  brandNumberActive: {
    color: themeColors.primary,
  },
  label: {
    marginTop: 5,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  plainLabel: {
    color: themeColors.mutedForeground,
  },
  plainLabelActive: {
    color: themeColors.primary,
  },
  brandLabel: {
    color: 'rgba(255,255,255,0.68)',
  },
  brandLabelActive: {
    color: themeColors.primaryForeground,
  },
})
