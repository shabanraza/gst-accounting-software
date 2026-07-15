import { Link } from 'expo-router'
import { useState } from 'react'

import { AuthShell, FormField, PrimaryButton } from '@/components/screen'
import { Text } from '@/tw'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit() {
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setMessage('If the email exists, a reset link has been sent.')
  }

  return (
    <AuthShell title="Reset password">
      <FormField
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      {message ? <Text className="text-primary">{message}</Text> : null}
      <PrimaryButton
        label="Send reset link"
        onPress={() => void handleSubmit()}
      />
      <Link href="/(auth)/login">
        <Text className="text-primary">Back to sign in</Text>
      </Link>
    </AuthShell>
  )
}
