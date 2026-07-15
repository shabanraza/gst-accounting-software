import { Redirect } from 'expo-router'

import { useWorkspace } from '@/lib/workspace'

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { isReady, isLoading, needsOnboarding } = useWorkspace()

  if (isLoading || !isReady) {
    return null
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />
  }

  return children
}
