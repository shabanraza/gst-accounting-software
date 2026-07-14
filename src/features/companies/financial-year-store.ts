import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  FinancialYearRecord,
  FinancialYearRepository,
} from '#/features/companies/financial-year-service.ts'

export class InMemoryFinancialYearRepository implements FinancialYearRepository {
  private readonly financialYears: Array<FinancialYearRecord> = []

  async create(financialYear: FinancialYearRecord) {
    this.financialYears.push(financialYear)
    return financialYear
  }

  async listByCompanyId(companyId: string) {
    return this.financialYears.filter((item) => item.companyId === companyId)
  }
}

type FinancialYearRow = typeof schema.financialYears.$inferSelect

function mapRowToRecord(row: FinancialYearRow): FinancialYearRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
  }
}

export class DrizzleFinancialYearRepository implements FinancialYearRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(financialYear: FinancialYearRecord) {
    const [created] = await this.database
      .insert(schema.financialYears)
      .values({
        id: financialYear.id,
        companyId: financialYear.companyId,
        startDate: financialYear.startDate,
        endDate: financialYear.endDate,
        isActive: financialYear.isActive,
        createdAt: financialYear.createdAt,
      })
      .returning()

    return mapRowToRecord(created)
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.financialYears)
      .where(eq(schema.financialYears.companyId, companyId))

    return rows.map(mapRowToRecord)
  }
}

export function createFinancialYearRepository(): FinancialYearRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryFinancialYearRepository()
  }

  return new DrizzleFinancialYearRepository(database)
}
