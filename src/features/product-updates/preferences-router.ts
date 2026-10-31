import { z } from 'zod'

import {
  createTRPCRouter,
  protectedProcedure,
} from '#/integrations/trpc/init.ts'

import type { ProductUpdatesService } from '#/features/product-updates/product-updates-service.ts'

export function createPreferencesRouter(service: ProductUpdatesService) {
  return createTRPCRouter({
    productUpdates: protectedProcedure.query(({ ctx }) =>
      service.getPreference(ctx.session.user),
    ),
    setProductUpdates: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ ctx, input }) =>
        service.setPreference(ctx.session.user, input.enabled),
      ),
    shouldAskProductUpdates: protectedProcedure.query(({ ctx }) =>
      service.shouldAsk(ctx.session.user),
    ),
    declineProductUpdates: protectedProcedure.mutation(({ ctx }) =>
      service.declinePrompt(ctx.session.user),
    ),
  })
}
