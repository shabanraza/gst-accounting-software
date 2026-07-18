import { themeColors } from '@/lib/theme'
import { View } from '@/tw'

export function Separator({
  orientation = 'horizontal',
  className,
}: {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}) {
  return (
    <View
      className={className}
      style={
        orientation === 'horizontal'
          ? { height: 1, backgroundColor: `${themeColors.tabBorder}99` }
          : { width: 1, backgroundColor: `${themeColors.tabBorder}99` }
      }
    />
  )
}
