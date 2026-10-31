import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordForm } from '#/features/auth/components/forgot-password-form.tsx'
import { noindexHead } from '#/lib/seo.ts'

export const Route = createFileRoute('/forgot-password')({
  head: noindexHead,
  component: ForgotPasswordRoute,
})

function ForgotPasswordRoute() {
  return <ForgotPasswordForm />
}
