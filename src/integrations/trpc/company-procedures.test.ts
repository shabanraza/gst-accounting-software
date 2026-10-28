import { beforeEach, describe, expect, test } from 'vitest'

import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'
import { z } from 'zod'

import type { CompanyRole } from '#/features/companies/membership-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const userId = crypto.randomUUID()
const companyId = crypto.randomUUID()
const context: TRPCContext = {
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
}

const caller = createTRPCRouter({
  view: capabilityProcedure('view')
    .input(z.object({ companyId: z.string() }))
    .query(() => 'ok'),
  post: capabilityProcedure('post_sales')
    .input(z.object({ companyId: z.string() }))
    .mutation(() => 'ok'),
}).createCaller(context)

async function joinAs(role: CompanyRole) {
  await membershipRepository.create({
    id: crypto.randomUUID(),
    companyId,
    userId,
    role,
    createdAt: new Date(),
  })
}

describe('capabilityProcedure', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  test('reads the membership once per request', async () => {
    await joinAs('owner')
    let reads = 0
    const find =
      membershipRepository.findByCompanyAndUser.bind(membershipRepository)
    membershipRepository.findByCompanyAndUser = (...args) => {
      reads += 1
      return find(...args)
    }

    expect(await caller.view({ companyId })).toBe('ok')
    expect(reads).toBe(1)
  })

  test('still refuses a role without the capability', async () => {
    await joinAs('readonly')
    await expect(caller.post({ companyId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})
