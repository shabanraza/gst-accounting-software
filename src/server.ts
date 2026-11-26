import * as Sentry from '@sentry/cloudflare'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import handler from '@tanstack/react-start/server-entry'

import { sentryPrivacyOptions } from '#/features/analytics/options.ts'

// Custom Worker entry: wraps the TanStack Start handler so server-side errors
// are reported to Sentry (tRPC failures are captured in api.trpc.$.tsx).
// Dormant until VITE_PUBLIC_SENTRY_DSN is set at build time.
export default Sentry.withSentry(
  () => ({
    dsn: import.meta.env.VITE_PUBLIC_SENTRY_DSN,
    environment: import.meta.env.MODE,
    ...sentryPrivacyOptions,
    // Serves the browser tunnel route so ad-blockers can't drop Sentry events.
    integrations: [Sentry.serveTunnelIntegration()],
  }),
  wrapFetchWithSentry(handler),
)
