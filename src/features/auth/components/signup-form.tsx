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
import { authClient } from '#/lib/auth-client.ts'

function signupErrorMessage(error: { message?: string }) {
  const message = error.message ?? ''
  const isServerOrDbFailure =
    /internal server error|database|relation|migrate|econnrefused|failed query|does not exist/i.test(
      message,
    )
  if (isServerOrDbFailure) {
    return 'Account setup failed. Ensure the database is migrated (`bun run db:push`).'
  }
  return message || 'Unable to create account.'
}

export function SignupForm() {
  const navigate = useNavigate()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(signupErrorMessage(result.error))
      return
    }

    void navigate({ to: '/onboarding' })
  }

  return (
    <AuthPage
      description="Start a GST Books workspace for GST-ready books and inventory."
      title="Create account"
    >
      <AuthForm onSubmit={(event) => void handleSubmit(event)}>
        <AuthFieldGroup htmlFor="signup-name" label="Full name">
          <Input
            autoComplete="name"
            id="signup-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Mohammad Shaban"
            required
            type="text"
            value={name}
          />
        </AuthFieldGroup>
        <AuthFieldGroup htmlFor="signup-email" label="Email">
          <Input
            autoComplete="email"
            id="signup-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@business.com"
            required
            type="email"
            value={email}
          />
        </AuthFieldGroup>
        <AuthFieldGroup htmlFor="signup-password" label="Password">
          <Input
            autoComplete="new-password"
            id="signup-password"
            minLength={8}
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
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
        <AuthDivider />
        <GoogleSignInButton label="Sign up with Google" />
        <AuthFooterText>
          Already have an account?{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </AuthFooterText>
      </AuthForm>
    </AuthPage>
  )
}
