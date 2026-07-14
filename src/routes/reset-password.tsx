import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ResetPasswordForm } from '#/features/auth/components/reset-password-form.tsx'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  return <ResetPasswordForm />
}
