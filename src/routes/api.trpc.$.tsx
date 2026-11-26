import * as Sentry from '@sentry/tanstackstart-react'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createFileRoute } from '@tanstack/react-router'

import { shouldReportServerError } from '#/features/analytics/options.ts'
import { createTRPCContext } from '#/integrations/trpc/init.ts'
import { trpcRouter } from '#/integrations/trpc/router.ts'

function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    req: request,
    router: trpcRouter,
    endpoint: '/api/trpc',
    createContext: () => createTRPCContext({ request }),
    // tRPC answers with a 500 itself, so these never reach the Worker wrapper.
    onError: ({ error }) => {
      if (shouldReportServerError(error.code)) {
        Sentry.captureException(error.cause ?? error)
      }
    },
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
