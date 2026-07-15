import { Redirect } from 'expo-router'

import { authClient } from '@/lib/auth-client'

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return <Redirect href="/(app)/(tabs)/dashboard" />
}
