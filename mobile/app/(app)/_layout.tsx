import { Redirect, Stack } from 'expo-router'

import { WorkspaceGate } from '@/components/workspace-gate'
import { authClient } from '@/lib/auth-client'
import { hasStoredAuthSession } from '@/lib/trpc-auth'
import { WorkspaceProvider } from '@/lib/workspace'

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession()
  const hasStoredToken = hasStoredAuthSession()

  if (isPending && !hasStoredToken) return null
  if (!session && !hasStoredToken) return <Redirect href="/(auth)/login" />

  return (
    <WorkspaceProvider>
      <WorkspaceGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="module/[id]" />
          <Stack.Screen name="sales/[id]" />
          <Stack.Screen name="sales/new" />
          <Stack.Screen name="purchases/new" />
          <Stack.Screen name="purchases/[id]" />
          <Stack.Screen name="purchases/ocr" />
          <Stack.Screen name="purchases/ocr/[id]" />
          <Stack.Screen name="parties/new" />
          <Stack.Screen name="parties/[id]" />
          <Stack.Screen name="parties/[id]/edit" />
          <Stack.Screen name="items/new" />
          <Stack.Screen name="items/[id]" />
          <Stack.Screen name="items/[id]/edit" />
          <Stack.Screen name="sales-documents/new" />
        </Stack>
      </WorkspaceGate>
    </WorkspaceProvider>
  )
}
