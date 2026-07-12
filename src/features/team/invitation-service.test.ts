import { describe, expect, test } from 'vitest'

import { InMemoryMembershipRepository } from '#/features/companies/membership-store.ts'
import {
  acceptInvitation,
  createInvitation,
  InvitationError,
} from '#/features/team/invitation-service.ts'
import { InMemoryInvitationRepository } from '#/features/team/invitation-store.ts'

const setup = () => ({
  invitations: new InMemoryInvitationRepository(),
  memberships: new InMemoryMembershipRepository(),
})

describe('invitation service', () => {
  test('creates a pending invitation with a token and expiry', async () => {
    const { invitations } = setup()
    const invitation = await createInvitation(invitations, {
      companyId: crypto.randomUUID(),
      email: 'Teammate@Example.com',
      role: 'billing',
      invitedByUserId: crypto.randomUUID(),
    })

    expect(invitation.email).toBe('teammate@example.com')
    expect(invitation.status).toBe('pending')
    expect(invitation.token).toBeTruthy()
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  test('accepting an invite grants membership and marks it accepted', async () => {
    const { invitations, memberships } = setup()
    const companyId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    const invitation = await createInvitation(invitations, {
      companyId,
      email: 'teammate@example.com',
      role: 'accountant',
      invitedByUserId: crypto.randomUUID(),
    })

    const accepted = await acceptInvitation(
      { invitations, memberships },
      {
        token: invitation.token,
        userId,
        userEmail: 'teammate@example.com',
      },
    )

    expect(accepted.status).toBe('accepted')
    const membership = await memberships.findByCompanyAndUser(companyId, userId)
    expect(membership?.role).toBe('accountant')
  })

  test('rejects accepting with a mismatched email', async () => {
    const { invitations, memberships } = setup()
    const invitation = await createInvitation(invitations, {
      companyId: crypto.randomUUID(),
      email: 'teammate@example.com',
      role: 'billing',
      invitedByUserId: crypto.randomUUID(),
    })

    await expect(
      acceptInvitation(
        { invitations, memberships },
        {
          token: invitation.token,
          userId: crypto.randomUUID(),
          userEmail: 'someone-else@example.com',
        },
      ),
    ).rejects.toThrow(InvitationError)
  })

  test('rejects accepting an expired invite', async () => {
    const { invitations, memberships } = setup()
    const invitation = await createInvitation(invitations, {
      companyId: crypto.randomUUID(),
      email: 'teammate@example.com',
      role: 'billing',
      invitedByUserId: crypto.randomUUID(),
      now: new Date('2020-01-01T00:00:00.000Z'),
    })

    await expect(
      acceptInvitation(
        { invitations, memberships },
        {
          token: invitation.token,
          userId: crypto.randomUUID(),
          userEmail: 'teammate@example.com',
        },
      ),
    ).rejects.toThrow(/expired/i)
  })
})
