import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import type { ReactNode } from 'react'
import { RoutePending } from '#/features/app-shell/components/route-pending.tsx'
import { RouteError } from '#/features/app-shell/components/route-error.tsx'
import { NotFound } from '#/features/app-shell/components/not-found.tsx'
import { errorReporter } from '#/features/analytics/error-reporter.ts'
import { installClientErrorCapture } from '#/features/support/recent-errors.ts'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import TanstackQueryProvider, {
  getContext,
} from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()
  installClientErrorCapture()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 60_000,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,

    Wrap: (props: { children: ReactNode }) => {
      return (
        <TanstackQueryProvider context={context}>
          {props.children}
        </TanstackQueryProvider>
      )
    },
  })

  // Browser error monitoring loads after startup and stays off until
  // VITE_PUBLIC_SENTRY_DSN is set at build time.
  const sentryDsn = import.meta.env.VITE_PUBLIC_SENTRY_DSN
  if (!router.isServer && sentryDsn) {
    void errorReporter.start(async () => {
      const monitoring = await import(
        '#/features/analytics/browser-monitoring.ts'
      )
      return monitoring.startBrowserMonitoring(sentryDsn)
    })
  }

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
