import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '#/components/ui/button.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  AuthDivider,
  AuthFieldGroup,
  AuthFooterText,
  AuthForm,
  AuthPage,
} from '#/features/auth/components/auth-form-layout.tsx'
import { GoogleSignInButton } from '#/features/auth/components/google-sign-in-button.tsx'
import { SHOW_GOOGLE_AUTH } from '#/features/auth/google-auth.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
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
  const trpc = useTRPC()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [productUpdates, setProductUpdates] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const optIn = useMutation(trpc.preferences.setProductUpdates.mutationOptions())

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    })

    if (result.error) {
      setIsSubmitting(false)
      setError(signupErrorMessage(result.error))
      return
    }

    if (productUpdates) {
      // The account exists either way; the in-app prompt asks again if this fails.
      await optIn.mutateAsync({ enabled: true }).catch(() => undefined)
    }
    setIsSubmitting(false)
    void navigate({ to: '/onboarding' })
  }

  return (
    <AuthPage
      description="Start a HisaabKro workspace for GST-ready books and inventory."
      title="Create account"
    >
      <AuthForm onSubmit={(event) => void handleSubmit(event)}>
        <AuthFieldGroup htmlFor="signup-name" label="Full name">
          <Input
            autoComplete="name"
            id="signup-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
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
        <div className="flex items-center gap-2">
          <Checkbox
            checked={productUpdates}
            id="signup-product-updates"
            onCheckedChange={(checked) => setProductUpdates(checked === true)}
          />
          <Label className="font-normal" htmlFor="signup-product-updates">
            Email me product updates (new features and fixes)
          </Label>
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
        {SHOW_GOOGLE_AUTH ? (
          <>
            <AuthDivider />
            <GoogleSignInButton label="Sign up with Google" />
          </>
        ) : null}
        <AuthFooterText>
          Already have an account?{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </AuthFooterText>
        <AuthFooterText>
          By creating an account, you agree to HisaabKro handling your data as
          described in the{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/privacy"
          >
            Privacy Policy
          </Link>
          . You can request deletion from the{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/data-deletion"
          >
            Data Deletion page
          </Link>
          .
        </AuthFooterText>
      </AuthForm>
    </AuthPage>
  )
}
