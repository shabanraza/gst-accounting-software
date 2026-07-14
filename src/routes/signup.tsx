import { createFileRoute, redirect } from '@tanstack/react-router'

import { SignupForm } from '#/features/auth/components/signup-form.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await authClient.getSession()
    if (session.data) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: SignupRoute,
})

function SignupRoute() {
  return <SignupForm />
}
