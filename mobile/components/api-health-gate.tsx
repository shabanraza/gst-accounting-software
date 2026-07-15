import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { PrimaryButton } from '@/components/ui/button'
import { Text, View } from '@/tw'
import { checkApiHealthWithTimeout } from '@/lib/api-health-timeout'
import { resolveApiBaseUrl } from '@/lib/env'
import { pagePaddingHorizontal, themeColors } from '@/lib/theme'

export function ApiHealthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [message, setMessage] = useState<string | null>(null)

  async function runHealthCheck() {
    setStatus('checking')
    setMessage(null)

    const result = await checkApiHealthWithTimeout()
    if (result.ok) {
      setStatus('ready')
      return
    }

    setStatus('error')
    setMessage(result.message)
  }

  useEffect(() => {
    void runHealthCheck()
  }, [])

  if (status === 'checking') {
    return (
      <View
        className="flex-1 items-center justify-center gap-3 bg-background"
        style={pagePaddingHorizontal}
      >
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text className="text-base text-muted-foreground">Connecting to API…</Text>
        <Text className="text-sm text-muted-foreground">{resolveApiBaseUrl()}</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View
        className="flex-1 justify-center gap-4 bg-background"
        style={pagePaddingHorizontal}
      >
        <Text className="text-2xl font-bold text-foreground">Cannot reach API</Text>
        <Text className="text-muted-foreground">{message}</Text>
        <Text className="text-sm text-muted-foreground">
          API URL: {resolveApiBaseUrl()}
        </Text>
        <PrimaryButton label="Retry connection" onPress={() => void runHealthCheck()} />
      </View>
    )
  }

  return children
}
