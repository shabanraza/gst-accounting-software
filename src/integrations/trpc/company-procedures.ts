import {
  InsufficientRoleError,
  rolesForCapability,
} from '#/features/companies/membership-service.ts'

import { companyProcedure } from './init'

import type { Capability } from '#/features/companies/membership-service.ts'

/**
 * Company-scoped mutation that enforces the given role capability for the
 * signed-in user against the company in the input. The membership actor is the
 * session user (`ctx.userId`); clients cannot spoof it. The membership was
 * already loaded by companyProcedure, so this check costs no extra query.
 */
export function capabilityProcedure(capability: Capability) {
  return companyProcedure.use(({ ctx, next }) => {
    const allowedRoles = rolesForCapability(capability)
    if (!allowedRoles.includes(ctx.membership.role)) {
      throw new InsufficientRoleError(ctx.membership.role, allowedRoles)
    }
    return next()
  })
}
