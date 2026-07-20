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
      if (!(await persistAuthTokenFromSignIn(result))) {
        setError('Sign-in succeeded but the session token was not saved.')
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="HisaabKro" subtitle="Sign in to your workspace">
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
      <PrimaryButton
        label={loading ? 'Signing in…' : 'Sign in'}
        loading={loading}
        disabled={loading}
        onPress={() => void handleSubmit()}
      />
      <Link href="/(auth)/signup">
        <Text className="text-primary">Create account</Text>
      </Link>
      <Link href="/(auth)/forgot-password">
        <Text className="text-muted-foreground">Forgot password?</Text>
      </Link>
      <Text className="text-center text-xs text-muted-foreground">
        <Text
          className="text-xs text-muted-foreground"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        >
          Privacy
        </Text>
        {' · '}
        <Text
          className="text-xs text-muted-foreground"
          onPress={() => void Linking.openURL(DATA_DELETION_URL)}
        >
          Data deletion
        </Text>
      </Text>
    </AuthShell>
  )
}
