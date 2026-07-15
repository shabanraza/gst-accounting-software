import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { View } from '@/tw'
import { authClient } from '@/lib/auth-client'
import { resolvePostAuthHref } from '@/lib/post-auth-route'
import {
  ensureTrpcAuthReady,
  hasStoredAuthSession,
} from '@/lib/trpc-auth'
import {
  isSessionExpired,
  subscribeSessionExpired,
} from '@/lib/session-expired'

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession()
  const [href, setHref] = useState<
    '/(auth)/login' | '/(app)/(tabs)/dashboard' | '/onboarding' | null
  >(null)
  const [expired, setExpired] = useState(isSessionExpired())

  useEffect(() => {
    return subscribeSessionExpired(() => {
      setExpired(true)
      setHref('/(auth)/login')
    })
  }, [])

  useEffect(() => {
    if (expired) return
    if (isPending && !hasStoredAuthSession()) return
    if (!session && !hasStoredAuthSession()) {
      setHref('/(auth)/login')
      return
    }

    void ensureTrpcAuthReady()
      .then(() => resolvePostAuthHref())
      .then(setHref)
      .catch(() => setHref('/(auth)/login'))
  }, [expired, isPending, session])

  if (expired) {
    return <Redirect href="/(auth)/login" />
  }

  if ((isPending && !hasStoredAuthSession()) || !href) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={href} />
}
