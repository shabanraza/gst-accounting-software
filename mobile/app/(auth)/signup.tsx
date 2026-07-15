import { Link, useRouter } from 'expo-router'
import { useState } from 'react'

import { Pressable, Text, TextInput, View } from '@/tw'
import { authClient } from '@/lib/auth-client'
import { formatAuthNetworkError } from '@/lib/auth-error'

export default function SignupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    try {
      const result = await authClient.signUp.email({ name, email, password })
      if (result.error) {
        setError(result.error.message ?? 'Unable to create account.')
        return
      }
      router.replace('/onboarding')
    } catch (caught) {
      setError(formatAuthNetworkError(caught))
    }
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-3xl font-bold text-gray-900">Create account</Text>
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        autoCapitalize="none"
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="text-red-600">{error}</Text> : null}
      <Pressable
        className="items-center rounded-xl bg-indigo-600 px-4 py-3"
        onPress={() => void handleSubmit()}
      >
        <Text className="font-semibold text-white">Sign up</Text>
      </Pressable>
      <Link href="/(auth)/login">
        <Text className="text-indigo-600">Already have an account?</Text>
      </Link>
    </View>
  )
}
