import * as Sentry from '@sentry/cloudflare'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import handler from '@tanstack/react-start/server-entry'

// Custom Worker entry: wraps the TanStack Start handler so server-side errors
// (tRPC, server functions, SSR) are reported to Sentry. Dormant until
// VITE_PUBLIC_SENTRY_DSN is set at build time.
export default Sentry.withSentry(
  () => ({
    dsn: import.meta.env.VITE_PUBLIC_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Set to 1.0 to capture 100% of spans for tracing; reduce in production.
    tracesSampleRate: 0.2,
    // Serves the browser tunnel route so ad-blockers can't drop Sentry events.
    integrations: [Sentry.serveTunnelIntegration()],
  }),
  // @ts-expect-error - handler is not typed as a Cloudflare handler
  wrapFetchWithSentry(handler),
)
