import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  GodownRecord,
  GodownRepository,
} from '#/features/inventory/godown-service.ts'

export class InMemoryGodownRepository implements GodownRepository {
  private readonly godowns: Array<GodownRecord> = []

  async findById(id: string) {
    return this.godowns.find((godown) => godown.id === id) ?? null
  }

  async findByCompanyAndName(companyId: string, name: string) {
    return (
      this.godowns.find(
        (godown) => godown.companyId === companyId && godown.name === name,
      ) ?? null
    )
  }

  async create(godown: GodownRecord) {
    this.godowns.push(godown)
    return godown
  }

  async update(godown: GodownRecord) {
    const index = this.godowns.findIndex((entry) => entry.id === godown.id)
    if (index >= 0) {
      this.godowns[index] = godown
    }
    return godown
  }

  async delete(id: string) {
    const index = this.godowns.findIndex((entry) => entry.id === id)
    if (index >= 0) {
      this.godowns.splice(index, 1)
    }
  }

  async clearDefaultForCompany(companyId: string) {
    for (const godown of this.godowns) {
      if (godown.companyId === companyId) {
        godown.isDefault = false
      }
    }
  }

  async listByCompanyId(companyId: string) {
    return this.godowns.filter((godown) => godown.companyId === companyId)
  }
}

type GodownRow = typeof schema.godowns.$inferSelect

function mapRowToGodownRecord(row: GodownRow): GodownRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  }
}

export class DrizzleGodownRepository implements GodownRepository {
  constructor(private readonly database: AppDatabase) {}

  async findById(id: string) {
    const godowns = await this.database
      .select()
      .from(schema.godowns)
      .where(eq(schema.godowns.id, id))
      .limit(1)

    if (godowns.length === 0) {
      return null
    }

    return mapRowToGodownRecord(godowns[0])
  }

  async findByCompanyAndName(companyId: string, name: string) {
    const godowns = await this.database
      .select()
      .from(schema.godowns)
      .where(
        and(
          eq(schema.godowns.companyId, companyId),
          eq(schema.godowns.name, name),
        ),
      )
      .limit(1)

    if (godowns.length === 0) {
      return null
    }

    return mapRowToGodownRecord(godowns[0])
  }

  async create(godown: GodownRecord) {
    const [createdGodown] = await this.database
      .insert(schema.godowns)
      .values({
        id: godown.id,
        companyId: godown.companyId,
        name: godown.name,
        isDefault: godown.isDefault,
        createdAt: godown.createdAt,
      })
      .returning()

    return mapRowToGodownRecord(createdGodown)
  }

  async update(godown: GodownRecord) {
    const [updated] = await this.database
      .update(schema.godowns)
      .set({
        name: godown.name,
        isDefault: godown.isDefault,
      })
      .where(eq(schema.godowns.id, godown.id))
      .returning()

    return mapRowToGodownRecord(updated)
  }

  async delete(id: string) {
    await this.database.delete(schema.godowns).where(eq(schema.godowns.id, id))
  }

  async clearDefaultForCompany(companyId: string) {
    await this.database
      .update(schema.godowns)
      .set({ isDefault: false })
      .where(eq(schema.godowns.companyId, companyId))
  }

  async listByCompanyId(companyId: string) {
    const godowns = await this.database
      .select()
      .from(schema.godowns)
      .where(eq(schema.godowns.companyId, companyId))

    return godowns.map(mapRowToGodownRecord)
  }
}

export function createGodownRepository(): GodownRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryGodownRepository()
  }

  return new DrizzleGodownRepository(database)
}

export const godownRepository = createGodownRepository()
