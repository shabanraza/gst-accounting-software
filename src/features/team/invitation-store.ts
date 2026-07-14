import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  InvitationRecord,
  InvitationRepository,
  InvitationStatus,
} from '#/features/team/invitation-service.ts'
import type { CompanyRole } from '#/features/companies/membership-service.ts'

export class InMemoryInvitationRepository implements InvitationRepository {
  private readonly invitations: Array<InvitationRecord> = []

  async create(invitation: InvitationRecord) {
    this.invitations.push(invitation)
    return invitation
  }

  async findByToken(token: string) {
    return this.invitations.find((entry) => entry.token === token) ?? null
  }

  async findByCompanyAndEmail(companyId: string, email: string) {
    return (
      this.invitations.find(
        (entry) => entry.companyId === companyId && entry.email === email,
      ) ?? null
    )
  }

  async listByCompanyId(companyId: string) {
    return this.invitations.filter((entry) => entry.companyId === companyId)
  }

  async update(invitation: InvitationRecord) {
    const index = this.invitations.findIndex(
      (entry) => entry.id === invitation.id,
    )
    if (index >= 0) {
      this.invitations[index] = invitation
    }
    return invitation
  }
}

type InvitationRow = typeof schema.companyInvitations.$inferSelect

function mapRow(row: InvitationRow): InvitationRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    email: row.email,
    role: row.role as CompanyRole,
    token: row.token,
    status: row.status as InvitationStatus,
    invitedByUserId: row.invitedByUserId,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  }
}

export class DrizzleInvitationRepository implements InvitationRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(invitation: InvitationRecord) {
    const [created] = await this.database
      .insert(schema.companyInvitations)
      .values({
        id: invitation.id,
        companyId: invitation.companyId,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        invitedByUserId: invitation.invitedByUserId,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
      })
      .returning()

    return mapRow(created)
  }

  async findByToken(token: string) {
    const rows = await this.database
      .select()
      .from(schema.companyInvitations)
      .where(eq(schema.companyInvitations.token, token))
      .limit(1)

    return rows.length > 0 ? mapRow(rows[0]) : null
  }

  async findByCompanyAndEmail(companyId: string, email: string) {
    const rows = await this.database
      .select()
      .from(schema.companyInvitations)
      .where(
        and(
          eq(schema.companyInvitations.companyId, companyId),
          eq(schema.companyInvitations.email, email),
        ),
      )
      .limit(1)

    return rows.length > 0 ? mapRow(rows[0]) : null
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.companyInvitations)
      .where(eq(schema.companyInvitations.companyId, companyId))

    return rows.map(mapRow)
  }

  async update(invitation: InvitationRecord) {
    const [updated] = await this.database
      .update(schema.companyInvitations)
      .set({
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        invitedByUserId: invitation.invitedByUserId,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
      })
      .where(eq(schema.companyInvitations.id, invitation.id))
      .returning()

    return mapRow(updated)
  }
}

export function createInvitationRepository(): InvitationRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryInvitationRepository()
  }
  return new DrizzleInvitationRepository(database)
}

export const invitationRepository = createInvitationRepository()
