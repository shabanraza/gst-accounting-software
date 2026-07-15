import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'

type MetricTone = 'blue' | 'emerald' | 'amber' | 'violet'

const toneStyles: Record<
  MetricTone,
  { bg: string; icon: string; accent: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    icon: '#2563eb',
    accent: 'text-blue-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: '#059669',
    accent: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: '#d97706',
    accent: 'text-amber-700',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: '#7c3aed',
    accent: 'text-violet-700',
  },
}

export function DashboardMetricCard({
  label,
  amount,
  icon,
  tone = 'blue',
  onPress,
}: {
  label: string
  amount: string
  icon: keyof typeof Ionicons.glyphMap
  tone?: MetricTone
  onPress?: () => void
}) {
  const styles = toneStyles[tone]

  return (
    <Pressable
      className={`min-w-[148px] rounded-2xl border border-blue-100 p-4 ${styles.bg}`}
      onPress={onPress}
    >
      <View className="mb-3 size-9 items-center justify-center rounded-xl bg-white/80">
        <Ionicons name={icon} size={18} color={styles.icon} />
      </View>
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </Text>
      <Text className={`mt-1 text-lg font-bold ${styles.accent}`}>{amount}</Text>
    </Pressable>
  )
}
