import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { AppShell } from '#/features/app-shell/components/app-shell.tsx'
import { WorkspaceLoadingGate } from '#/features/app-shell/components/workspace-loading-gate.tsx'
import { WorkspaceProvider } from '#/features/app-shell/workspace-context.tsx'
import { trpcClient } from '#/integrations/tanstack-query/root-provider.tsx'
import { ensureAppAccess } from '#/features/app-shell/app-access.ts'
import { authClient } from '#/lib/auth-client.ts'
import { noindexHead } from '#/lib/seo.ts'

import type { AppAccess } from '#/features/app-shell/app-access.ts'

export const Route = createFileRoute('/app')({
  head: noindexHead,
  beforeLoad: async ({ location, context }) => {
    if (location.pathname === '/app' || location.pathname === '/app/') {
      throw redirect({
        to: '/app/dashboard',
      })
    }

    if (typeof window === 'undefined') return

    let access: AppAccess
    try {
      access = await ensureAppAccess(context.queryClient, {
        hasSession: async () => Boolean((await authClient.getSession()).data),
        listCompanies: () => trpcClient.companies.list.query(),
      })
    } catch {
      return
    }

    if (access === 'login') {
      throw redirect({ to: '/login' })
    }
    if (access === 'onboarding') {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isPrintRoute = pathname.endsWith('/print')

  return (
    <WorkspaceProvider>
      {isPrintRoute ? (
        <div className="min-h-screen bg-muted/30 print:bg-white">
          <Outlet />
        </div>
      ) : (
        <AppShell>
          <WorkspaceLoadingGate>
            <Outlet />
          </WorkspaceLoadingGate>
        </AppShell>
      )}
    </WorkspaceProvider>
  )
}
