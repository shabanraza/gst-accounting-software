import { Redirect, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { WorkspaceGate } from '@/components/workspace-gate'
import { authClient } from '@/lib/auth-client'
import {
  hasStoredAuthSession,
} from '@/lib/trpc-auth'
import {
  isSessionExpired,
  resetSessionExpiredState,
  subscribeSessionExpired,
} from '@/lib/session-expired'
import { themeColors } from '@/lib/theme'
import { WorkspaceProvider } from '@/lib/workspace'
import { View } from '@/tw'

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession()
  const hasStoredToken = hasStoredAuthSession()
  const [expired, setExpired] = useState(isSessionExpired())

  useEffect(() => {
    return subscribeSessionExpired(() => {
      setExpired(true)
    })
  }, [])

  useEffect(() => {
    if (session) {
      resetSessionExpiredState()
      setExpired(false)
    }
  }, [session])

  if (isPending && !hasStoredToken) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    )
  }
  if (expired || (!session && !hasStoredToken)) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <WorkspaceProvider>
      <WorkspaceGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
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
