import { describe, expect, it } from 'vitest'

import TanstackQueryProvider, {
  getContext,
  trpcClient,
} from '#/integrations/tanstack-query/root-provider.tsx'

describe('root provider', () => {
  it('exports the router context helpers used by TanStack Start', () => {
    const context = getContext()

    expect(trpcClient).toBeDefined()
    expect(context.queryClient).toBeDefined()
    expect(context.trpc).toBeDefined()
    expect(TanstackQueryProvider).toBeTypeOf('function')
  })
})
