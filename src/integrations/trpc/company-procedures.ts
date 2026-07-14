import { assertCapability } from '#/features/companies/membership-service.ts'
import { createMembershipRepository } from '#/features/companies/membership-store.ts'

import { companyProcedure } from './init'

import type { Capability } from '#/features/companies/membership-service.ts'

const memberships = createMembershipRepository()

/**
 * Company-scoped mutation that enforces the given role capability for the
 * signed-in user against the company in the input. The membership actor is the
 * session user (`ctx.userId`); clients cannot spoof it.
 */
export function capabilityProcedure(capability: Capability) {
  return companyProcedure.use(async ({ ctx, next }) => {
    await assertCapability(memberships, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      capability,
    })
    return next({ ctx })
  })
}
