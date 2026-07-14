import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  AuthFieldGroup,
  AuthFooterText,
  AuthForm,
  AuthPage,
} from '#/features/auth/components/auth-form-layout.tsx'
import { authClient } from '#/lib/auth-client.ts'

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/reset-password' })
  const token = search.token
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('Reset link is invalid or expired.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? 'Unable to reset password.')
      return
    }

    void navigate({ to: '/login' })
  }

  return (
    <AuthPage
      description="Choose a strong password you will remember."
      title="Set a new password"
    >
      <AuthForm onSubmit={(event) => void handleSubmit(event)}>
        <AuthFieldGroup htmlFor="reset-password" label="New password">
          <Input
            autoComplete="new-password"
            id="reset-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </AuthFieldGroup>
        <AuthFieldGroup htmlFor="reset-confirm" label="Confirm password">
          <Input
            autoComplete="new-password"
            id="reset-confirm"
            minLength={8}
            onChange={(event) => setConfirm(event.target.value)}
            required
            type="password"
            value={confirm}
          />
        </AuthFieldGroup>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Reset password'}
        </Button>
        <AuthFooterText>
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/login"
          >
            Back to sign in
          </Link>
        </AuthFooterText>
      </AuthForm>
    </AuthPage>
  )
}
