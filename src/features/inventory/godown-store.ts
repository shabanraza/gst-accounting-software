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
