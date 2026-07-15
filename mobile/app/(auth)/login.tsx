import { Link, useRouter } from 'expo-router'
import { useState } from 'react'

import { Pressable, Text, TextInput, View } from '@/tw'
import { authClient } from '@/lib/auth-client'
import { formatAuthNetworkError } from '@/lib/auth-error'
import { resolvePostAuthHref } from '@/lib/post-auth-route'
import { ensureTrpcAuthReady } from '@/lib/trpc-auth'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in.')
        return
      }
      await ensureTrpcAuthReady({ signInToken: result.data?.token })
      router.replace(await resolvePostAuthHref())
    } catch (caught) {
      setError(formatAuthNetworkError(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-3xl font-bold text-gray-900">GST Books</Text>
      <Text className="text-gray-500">Sign in to your workspace</Text>
      <TextInput
        autoCapitalize="none"
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="text-red-600">{error}</Text> : null}
      <Pressable
        className="items-center rounded-xl bg-indigo-600 px-4 py-3"
        disabled={loading}
        onPress={() => void handleSubmit()}
      >
        <Text className="font-semibold text-white">
          {loading ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>
      <Link href="/(auth)/signup">
        <Text className="text-indigo-600">Create account</Text>
      </Link>
      <Link href="/(auth)/forgot-password">
        <Text className="text-gray-500">Forgot password?</Text>
      </Link>
    </View>
  )
}
