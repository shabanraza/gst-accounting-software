import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { AppShell } from '#/features/app-shell/components/app-shell.tsx'
import { WorkspaceProvider } from '#/features/app-shell/workspace-context.tsx'
import { trpcClient } from '#/integrations/tanstack-query/root-provider.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/app' || location.pathname === '/app/') {
      throw redirect({
        to: '/app/dashboard',
      })
    }

    if (typeof window === 'undefined') return

    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }

    let companies: Array<{ id: string }> = []
    try {
      companies = await trpcClient.companies.list.query()
    } catch {
      return
    }

    if (companies.length === 0) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isPrintRoute = pathname.endsWith('/print')

  return (
    <WorkspaceProvider>
      {isPrintRoute ? (
        <div className="min-h-screen bg-muted/30 print:bg-white">
          <Outlet />
        </div>
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </WorkspaceProvider>
  )
}
