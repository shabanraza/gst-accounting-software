import { Link, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
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

const PRIVACY_POLICY_URL = 'https://hisaabkro.in/privacy'
const DATA_DELETION_URL = 'https://hisaabkro.in/data-deletion'

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
      {error ? <Text className="text-destructive">{error}</Text> : null}
      <PrimaryButton label="Sign up" onPress={() => void handleSubmit()} />
      <Link href="/(auth)/login">
        <Text className="text-primary">Already have an account?</Text>
      </Link>
      <Text className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{' '}
        <Text
          className="text-xs text-muted-foreground"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        >
          Privacy Policy
        </Text>
        . Request removal from{' '}
        <Text
          className="text-xs text-muted-foreground"
          onPress={() => void Linking.openURL(DATA_DELETION_URL)}
        >
          Data Deletion
        </Text>
        .
      </Text>
    </AuthShell>
  )
}
