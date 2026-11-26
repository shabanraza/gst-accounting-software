import * as Sentry from '@sentry/tanstackstart-react'

import { sentryPrivacyOptions } from '#/features/analytics/options.ts'

/** Starts Sentry in the browser and returns how to report a caught error. */
export function startBrowserMonitoring(dsn: string) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Route browser envelopes through the server's managed tunnel so
    // ad-blockers can't drop them.
    tunnel: true,
    ...sentryPrivacyOptions,
    // Clicked elements and console lines can carry party names and amounts.
    integrations: (defaults) => [
      ...defaults.filter(
        (integration) =>
          integration.name !== 'Breadcrumbs' && integration.name !== 'Console',
      ),
      Sentry.breadcrumbsIntegration({ dom: false }),
    ],
  })

  return (error: unknown) => {
    Sentry.captureException(error)
  }
}
