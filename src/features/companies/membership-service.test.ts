import { describe, expect, test } from 'vitest'

import {
  InsufficientRoleError,
  assertMembershipRole,
  assignCompanyMembership,
} from '#/features/companies/membership-service.ts'
import { InMemoryMembershipRepository } from '#/features/companies/membership-store.ts'

describe('assertMembershipRole', () => {
  test('resolves when the member has an allowed role', async () => {
    const repository = new InMemoryMembershipRepository()
    await assignCompanyMembership(repository, {
      companyId: 'company-1',
      userId: 'user-1',
      role: 'accountant',
    })

    const membership = await assertMembershipRole(repository, {
      companyId: 'company-1',
      userId: 'user-1',
      allowedRoles: ['owner', 'admin', 'accountant'],
    })

    expect(membership.role).toBe('accountant')
  })

  test('rejects when the member has a disallowed role', async () => {
    const repository = new InMemoryMembershipRepository()
    await assignCompanyMembership(repository, {
      companyId: 'company-1',
      userId: 'user-1',
      role: 'readonly',
    })

    await expect(
      assertMembershipRole(repository, {
        companyId: 'company-1',
        userId: 'user-1',
        allowedRoles: ['owner', 'admin', 'accountant'],
      }),
    ).rejects.toBeInstanceOf(InsufficientRoleError)
  })

  test('rejects when no membership exists for the company and user', async () => {
    const repository = new InMemoryMembershipRepository()

    await expect(
      assertMembershipRole(repository, {
        companyId: 'company-1',
        userId: 'unknown-user',
        allowedRoles: ['owner'],
      }),
    ).rejects.toBeInstanceOf(InsufficientRoleError)
  })
})
