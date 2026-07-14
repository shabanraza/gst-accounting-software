import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  AuthDivider,
  AuthFieldGroup,
  AuthFooterText,
  AuthForm,
  AuthPage,
} from '#/features/auth/components/auth-form-layout.tsx'
import { GoogleSignInButton } from '#/features/auth/components/google-sign-in-button.tsx'
import { SHOW_GOOGLE_AUTH } from '#/features/auth/google-auth.ts'
import { authClient } from '#/lib/auth-client.ts'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signIn.email({
      email,
      password,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? 'Unable to sign in.')
      return
    }

    void navigate({ to: '/app/dashboard' })
  }

  return (
    <AuthPage
      description="Access your GST Books workspace and company ledgers."
      title="Sign in"
    >
      <AuthForm onSubmit={(event) => void handleSubmit(event)}>
        <AuthFieldGroup htmlFor="login-email" label="Email">
          <Input
            autoComplete="email"
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@business.com"
            required
            type="email"
            value={email}
          />
        </AuthFieldGroup>
        <AuthFieldGroup
          hint={
            <Link
              className="inline-flex min-h-6 items-center py-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          }
          htmlFor="login-password"
          label="Password"
        >
          <Input
            autoComplete="current-password"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </AuthFieldGroup>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
        {SHOW_GOOGLE_AUTH ? (
          <>
            <AuthDivider />
            <GoogleSignInButton label="Continue with Google" />
          </>
        ) : null}
        <AuthFooterText>
          Need an account?{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/signup"
          >
            Create one
          </Link>
        </AuthFooterText>
      </AuthForm>
    </AuthPage>
  )
}
