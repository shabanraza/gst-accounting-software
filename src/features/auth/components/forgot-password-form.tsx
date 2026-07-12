import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button.tsx'
import { CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  AuthFieldGroup,
  AuthFooterText,
  AuthForm,
  AuthPage,
} from '#/features/auth/components/auth-form-layout.tsx'
import { authClient } from '#/lib/auth-client.ts'

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? 'Unable to send reset link.')
      return
    }

    setSent(true)
  }

  return (
    <AuthPage
      description="Enter your email and we will send a reset link."
      title="Reset password"
    >
      {sent ? (
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            If an account exists for {email}, a reset link is on its way. Check
            your inbox.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      ) : (
        <AuthForm onSubmit={(event) => void handleSubmit(event)}>
          <AuthFieldGroup htmlFor="forgot-email" label="Email">
            <Input
              autoComplete="email"
              id="forgot-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@business.com"
              required
              type="email"
              value={email}
            />
          </AuthFieldGroup>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
          <AuthFooterText>
            Remembered it?{' '}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/login"
            >
              Sign in
            </Link>
          </AuthFooterText>
        </AuthForm>
      )}
    </AuthPage>
  )
}
