import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createFileRoute } from '@tanstack/react-router'

import { createTRPCContext } from '#/integrations/trpc/init.ts'
import { trpcRouter } from '#/integrations/trpc/router.ts'

function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    req: request,
    router: trpcRouter,
    endpoint: '/api/trpc',
    createContext: () => createTRPCContext({ request }),
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
