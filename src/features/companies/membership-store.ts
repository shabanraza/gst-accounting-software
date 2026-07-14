import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  MembershipRecord,
  MembershipRepository,
} from '#/features/companies/membership-service.ts'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly memberships: Array<MembershipRecord> = []

  async create(membership: MembershipRecord) {
    this.memberships.push(membership)
    return membership
  }

  async findByCompanyAndUser(companyId: string, userId: string) {
    return (
      this.memberships.find(
        (membership) =>
          membership.companyId === companyId && membership.userId === userId,
      ) ?? null
    )
  }

  async listByUserId(userId: string) {
    return this.memberships.filter((membership) => membership.userId === userId)
  }

  async listByCompanyId(companyId: string) {
    return this.memberships.filter(
      (membership) => membership.companyId === companyId,
    )
  }

  async updateRole(
    companyId: string,
    userId: string,
    role: MembershipRecord['role'],
  ) {
    const membership = this.memberships.find(
      (entry) => entry.companyId === companyId && entry.userId === userId,
    )
    if (!membership) return null
    membership.role = role
    return membership
  }

  async remove(companyId: string, userId: string) {
    const index = this.memberships.findIndex(
      (entry) => entry.companyId === companyId && entry.userId === userId,
    )
    if (index >= 0) this.memberships.splice(index, 1)
  }

  clear() {
    this.memberships.length = 0
  }
}

type MembershipRow = typeof schema.companyMemberships.$inferSelect

function mapRowToRecord(row: MembershipRow): MembershipRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId,
    role: row.role as MembershipRecord['role'],
    createdAt: row.createdAt,
  }
}

export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(membership: MembershipRecord) {
    const [created] = await this.database
      .insert(schema.companyMemberships)
      .values({
        id: membership.id,
        companyId: membership.companyId,
        userId: membership.userId,
        role: membership.role,
        createdAt: membership.createdAt,
      })
      .returning()

    return mapRowToRecord(created)
  }

  async findByCompanyAndUser(companyId: string, userId: string) {
    const rows = await this.database
      .select()
      .from(schema.companyMemberships)
      .where(
        and(
          eq(schema.companyMemberships.companyId, companyId),
          eq(schema.companyMemberships.userId, userId),
        ),
      )
      .limit(1)

    if (rows.length === 0) return null
    return mapRowToRecord(rows[0])
  }

  async listByUserId(userId: string) {
    const rows = await this.database
      .select()
      .from(schema.companyMemberships)
      .where(eq(schema.companyMemberships.userId, userId))

    return rows.map(mapRowToRecord)
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.companyMemberships)
      .where(eq(schema.companyMemberships.companyId, companyId))

    return rows.map(mapRowToRecord)
  }

  async updateRole(
    companyId: string,
    userId: string,
    role: MembershipRecord['role'],
  ) {
    const rows = await this.database
      .update(schema.companyMemberships)
      .set({ role })
      .where(
        and(
          eq(schema.companyMemberships.companyId, companyId),
          eq(schema.companyMemberships.userId, userId),
        ),
      )
      .returning()

    const updated = rows.at(0)
    return updated ? mapRowToRecord(updated) : null
  }

  async remove(companyId: string, userId: string) {
    await this.database
      .delete(schema.companyMemberships)
      .where(
        and(
          eq(schema.companyMemberships.companyId, companyId),
          eq(schema.companyMemberships.userId, userId),
        ),
      )
  }
}

let inMemoryMembershipRepository: InMemoryMembershipRepository | null = null

export function createMembershipRepository(): MembershipRepository {
  const database = getDb()
  if (!database) {
    if (!inMemoryMembershipRepository) {
      inMemoryMembershipRepository = new InMemoryMembershipRepository()
    }
    return inMemoryMembershipRepository
  }

  return new DrizzleMembershipRepository(database)
}

export const membershipRepository = createMembershipRepository()

export function resetMembershipRepositoryForTests() {
  if (inMemoryMembershipRepository) {
    inMemoryMembershipRepository.clear()
  }
}
