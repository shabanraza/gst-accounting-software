import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { Pressable, Text, View } from '@/tw'
import { checkApiHealthWithTimeout } from '@/lib/api-health-timeout'
import { resolveApiBaseUrl } from '@/lib/env'

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
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <ActivityIndicator size="large" />
        <Text className="text-base text-gray-600">Connecting to API…</Text>
        <Text className="text-sm text-gray-500">{resolveApiBaseUrl()}</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View className="flex-1 justify-center gap-4 bg-white px-6">
        <Text className="text-2xl font-bold text-gray-900">Cannot reach API</Text>
        <Text className="text-gray-600">{message}</Text>
        <Text className="text-sm text-gray-500">
          API URL: {resolveApiBaseUrl()}
        </Text>
        <Pressable
          className="items-center rounded-xl bg-teal-600 px-4 py-3"
          onPress={() => void runHealthCheck()}
        >
          <Text className="font-semibold text-white">Retry connection</Text>
        </Pressable>
      </View>
    )
  }

  return children
}
