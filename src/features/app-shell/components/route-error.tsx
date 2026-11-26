import * as React from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'

import { errorReporter } from '#/features/analytics/error-reporter.ts'
import { ErrorState } from '#/features/app-shell/components/error-state.tsx'
import { recordClientError } from '#/features/support/recent-errors.ts'

import type { ErrorComponentProps } from '@tanstack/react-router'

/** Shown in place of a page that threw while loading or rendering. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  React.useEffect(() => {
    recordClientError(error)
    errorReporter.report(error)
  }, [error])

  return (
    <ErrorState
      canReport={pathname.startsWith('/app')}
      message={error instanceof Error ? error.message : undefined}
      onRetry={() => {
        void router.invalidate().then(reset)
      }}
      title="This page hit an error"
    />
  )
}
