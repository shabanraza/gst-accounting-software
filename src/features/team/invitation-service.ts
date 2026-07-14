import {
  assignCompanyMembership,
} from '#/features/companies/membership-service.ts'

import type {
  CompanyRole,
  MembershipRepository,
} from '#/features/companies/membership-service.ts'

export type InvitationStatus = 'pending' | 'accepted' | 'revoked'

export type InvitationRecord = {
  id: string
  companyId: string
  email: string
  role: CompanyRole
  token: string
  status: InvitationStatus
  invitedByUserId: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface InvitationRepository {
  create: (invitation: InvitationRecord) => Promise<InvitationRecord>
  findByToken: (token: string) => Promise<InvitationRecord | null>
  findByCompanyAndEmail: (
    companyId: string,
    email: string,
  ) => Promise<InvitationRecord | null>
  listByCompanyId: (companyId: string) => Promise<Array<InvitationRecord>>
  update: (invitation: InvitationRecord) => Promise<InvitationRecord>
}

export class InvitationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvitationError'
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function createInvitation(
  repository: InvitationRepository,
  input: {
    companyId: string
    email: string
    role: CompanyRole
    invitedByUserId: string
    now?: Date
  },
): Promise<InvitationRecord> {
  const email = normalizeEmail(input.email)
  const now = input.now ?? new Date()

  const existing = await repository.findByCompanyAndEmail(input.companyId, email)
  if (existing && existing.status === 'pending') {
    const refreshed: InvitationRecord = {
      ...existing,
      role: input.role,
      token: crypto.randomUUID(),
      invitedByUserId: input.invitedByUserId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    }
    return repository.update(refreshed)
  }

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    email,
    role: input.role,
    token: crypto.randomUUID(),
    status: 'pending',
    invitedByUserId: input.invitedByUserId,
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    acceptedAt: null,
    createdAt: now,
  })
}

export async function acceptInvitation(
  deps: {
    invitations: InvitationRepository
    memberships: MembershipRepository
  },
  input: { token: string; userId: string; userEmail: string; now?: Date },
): Promise<InvitationRecord> {
  const now = input.now ?? new Date()
  const invitation = await deps.invitations.findByToken(input.token)

  if (!invitation) {
    throw new InvitationError('Invitation not found')
  }
  if (invitation.status !== 'pending') {
    throw new InvitationError('Invitation is no longer valid')
  }
  if (invitation.expiresAt.getTime() < now.getTime()) {
    throw new InvitationError('Invitation has expired')
  }
  if (invitation.email !== normalizeEmail(input.userEmail)) {
    throw new InvitationError('Invitation was issued to a different email')
  }

  await assignCompanyMembership(deps.memberships, {
    companyId: invitation.companyId,
    userId: input.userId,
    role: invitation.role,
  })

  return deps.invitations.update({
    ...invitation,
    status: 'accepted',
    acceptedAt: now,
  })
}

export async function revokeInvitation(
  repository: InvitationRepository,
  input: { companyId: string; email: string },
): Promise<void> {
  const invitation = await repository.findByCompanyAndEmail(
    input.companyId,
    normalizeEmail(input.email),
  )
  if (!invitation || invitation.status !== 'pending') return
  await repository.update({ ...invitation, status: 'revoked' })
}
