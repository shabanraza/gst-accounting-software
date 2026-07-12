import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordForm } from '#/features/auth/components/forgot-password-form.tsx'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordRoute,
})

function ForgotPasswordRoute() {
  return <ForgotPasswordForm />
}
