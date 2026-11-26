import * as React from 'react'

import { analytics } from '#/features/analytics/client.ts'
import { POSTHOG_OPTIONS } from '#/features/analytics/options.ts'
import { env } from '#/env.ts'

/** Loads PostHog after the first render, only when it is configured. */
export function AnalyticsLoader() {
  React.useEffect(() => {
    const key = env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
    const host = env.VITE_PUBLIC_POSTHOG_HOST
    if (!key || !host) return

    void analytics.start(async () => {
      const { default: posthog } = await import('posthog-js')
      posthog.init(key, { ...POSTHOG_OPTIONS, api_host: host })
      return posthog
    })
  }, [])

  return null
}
