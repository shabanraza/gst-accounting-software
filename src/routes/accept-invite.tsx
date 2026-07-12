import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { AcceptInvitePanel } from '#/features/team/components/accept-invite-panel.tsx'
import { authClient } from '#/lib/auth-client.ts'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/accept-invite')({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  component: AcceptInviteRoute,
})

function AcceptInviteRoute() {
  return <AcceptInvitePanel />
}
