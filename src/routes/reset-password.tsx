import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ResetPasswordForm } from '#/features/auth/components/reset-password-form.tsx'
import { noindexHead } from '#/lib/seo.ts'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  head: noindexHead,
  validateSearch: searchSchema,
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  return <ResetPasswordForm />
}
