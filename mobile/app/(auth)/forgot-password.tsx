import { Link } from 'expo-router'
import { useState } from 'react'

import { Pressable, Text, TextInput, View } from '@/tw'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit() {
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setMessage('If the email exists, a reset link has been sent.')
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold text-gray-900">Reset password</Text>
      <TextInput
        autoCapitalize="none"
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      {message ? <Text className="text-emerald-600">{message}</Text> : null}
      <Pressable
        className="items-center rounded-xl bg-blue-600 px-4 py-3"
        onPress={() => void handleSubmit()}
      >
        <Text className="font-semibold text-white">Send reset link</Text>
      </Pressable>
      <Link href="/(auth)/login">
        <Text className="text-blue-600">Back to sign in</Text>
      </Link>
    </View>
  )
}
