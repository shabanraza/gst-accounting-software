import { vi } from 'vitest'

/** Test stand-in for `#/integrations/trpc/react.ts` on marketing pages. */
const procedure = {
  mutationOptions: () => ({ mutationFn: vi.fn(async () => ({ ok: true })) }),
}

export const useTRPC = () => ({
  marketing: {
    subscribe: procedure,
    sendFeedback: procedure,
    sendContact: procedure,
  },
})
