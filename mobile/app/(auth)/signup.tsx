import { Link, useRouter } from 'expo-router'
import { useState } from 'react'

import { AuthShell } from '@/components/layout/auth-shell'
import { FormField } from '@/components/ui/form-field'
import { PrimaryButton } from '@/components/ui/button'
import { Text } from '@/tw'
import { authClient, refreshAuthSession } from '@/lib/auth-client'
import { formatAuthNetworkError } from '@/lib/auth-error'
import { PostAuthRouteError, resolvePostAuthHref } from '@/lib/post-auth-route'
import {
  persistAuthTokenFromSignIn,
  requireTrpcAuthReady,
} from '@/lib/trpc-auth'

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
      if (!(await persistAuthTokenFromSignIn(result))) {
        setError('Account created but the session token was not saved.')
        return
      }
      await requireTrpcAuthReady()
      await refreshAuthSession()
      router.replace(await resolvePostAuthHref())
    } catch (caught) {
      if (caught instanceof PostAuthRouteError) {
        setError(caught.message)
        return
      }
      setError(formatAuthNetworkError(caught))
    }
  }

  return (
    <AuthShell title="Create account">
      <FormField placeholder="Name" value={name} onChangeText={setName} />
      <FormField
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <FormField
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="text-icon-accent-red">{error}</Text> : null}
      <PrimaryButton label="Sign up" onPress={() => void handleSubmit()} />
      <Link href="/(auth)/login">
        <Text className="text-primary">Already have an account?</Text>
      </Link>
    </AuthShell>
  )
}
