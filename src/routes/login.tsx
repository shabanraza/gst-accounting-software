import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginForm } from '#/features/auth/components/login-form.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await authClient.getSession()
    if (session.data) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  return <LoginForm />
}
