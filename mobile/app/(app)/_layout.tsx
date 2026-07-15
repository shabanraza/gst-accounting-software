import { Redirect, Stack } from 'expo-router'

import { authClient } from '@/lib/auth-client'
import { WorkspaceProvider } from '@/lib/workspace'

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <WorkspaceProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="module/[id]" />
        <Stack.Screen name="sales/new" />
        <Stack.Screen name="purchases/new" />
        <Stack.Screen name="purchases/ocr" />
      </Stack>
    </WorkspaceProvider>
  )
}
