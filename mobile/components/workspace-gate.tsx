import { Redirect } from 'expo-router'
import { ActivityIndicator } from 'react-native'

import { useWorkspace } from '@/lib/workspace'
import { themeColors } from '@/lib/theme'
import { View } from '@/tw'

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { isReady, isLoading, needsOnboarding } = useWorkspace()

  if (isLoading || !isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    )
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />
  }

  return children
}
