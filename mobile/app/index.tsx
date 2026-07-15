import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { resolvePostAuthHref } from '@/lib/post-auth-route'
import { ensureTrpcAuthReady } from '@/lib/trpc-auth'

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession()
  const [href, setHref] = useState<
    '/(auth)/login' | '/(app)/(tabs)/dashboard' | '/onboarding' | null
  >(null)

  useEffect(() => {
    if (isPending) return
    if (!session) {
      setHref('/(auth)/login')
      return
    }

    void ensureTrpcAuthReady()
      .then(() => resolvePostAuthHref())
      .then(setHref)
  }, [isPending, session])

  if (isPending || !href) return null

  return <Redirect href={href} />
}
