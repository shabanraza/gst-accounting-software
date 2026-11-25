import * as Sentry from '@sentry/tanstackstart-react'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import type { ReactNode } from 'react'
import { RoutePending } from '#/features/app-shell/components/route-pending.tsx'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import TanstackQueryProvider, {
  getContext,
} from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 60_000,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: RoutePending,

    Wrap: (props: { children: ReactNode }) => {
      return (
        <TanstackQueryProvider context={context}>
          {props.children}
        </TanstackQueryProvider>
      )
    },
  })

  // Client-side Sentry init (browser error monitoring + router tracing).
  // Dormant until VITE_PUBLIC_SENTRY_DSN is set at build time.
  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_PUBLIC_SENTRY_DSN,
      environment: import.meta.env.MODE,
      // Route browser envelopes through the server's managed tunnel so
      // ad-blockers can't drop them.
      tunnel: true,
      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      tracesSampleRate: 0.2,
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
