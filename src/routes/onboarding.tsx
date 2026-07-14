import { createFileRoute, redirect } from '@tanstack/react-router'

import { CreateCompanyPanel } from '#/features/onboarding/components/create-company-panel.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  component: OnboardingRoute,
})

function OnboardingRoute() {
  return <CreateCompanyPanel />
}
