import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { View } from '@/tw'
import { authClient } from '@/lib/auth-client'
import { resolvePostAuthHref } from '@/lib/post-auth-route'
import { ensureTrpcAuthReady, hasStoredAuthSession } from '@/lib/trpc-auth'

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession()
  const [href, setHref] = useState<
    '/(auth)/login' | '/(app)/(tabs)/dashboard' | '/onboarding' | null
  >(null)

  useEffect(() => {
    if (isPending && !hasStoredAuthSession()) return
    if (!session && !hasStoredAuthSession()) {
      setHref('/(auth)/login')
      return
    }

    void ensureTrpcAuthReady()
      .then(() => resolvePostAuthHref())
      .then(setHref)
      .catch(() => setHref('/(auth)/login'))
  }, [isPending, session])

  if ((isPending && !hasStoredAuthSession()) || !href) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={href} />
}
