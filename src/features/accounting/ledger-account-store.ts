import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  LedgerAccountRecord,
  LedgerAccountRepository,
  LedgerAccountSystemKey,
  LedgerAccountType,
} from '#/features/accounting/chart-of-accounts.ts'

export class InMemoryLedgerAccountRepository implements LedgerAccountRepository {
  private readonly accounts: Array<LedgerAccountRecord> = []

  async listByCompanyId(companyId: string) {
    return this.accounts.filter((account) => account.companyId === companyId)
  }

  async createMany(accounts: Array<LedgerAccountRecord>) {
    this.accounts.push(...accounts)
    return accounts
  }
}

type LedgerAccountRow = typeof schema.ledgerAccounts.$inferSelect

function mapRowToLedgerAccountRecord(
  row: LedgerAccountRow,
): LedgerAccountRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    code: row.code,
    name: row.name,
    accountType: row.accountType as LedgerAccountType,
    systemKey: row.systemKey as LedgerAccountSystemKey | null,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
  }
}

export class DrizzleLedgerAccountRepository implements LedgerAccountRepository {
  constructor(private readonly database: AppDatabase) {}

  async listByCompanyId(companyId: string) {
    const accounts = await this.database
      .select()
      .from(schema.ledgerAccounts)
      .where(eq(schema.ledgerAccounts.companyId, companyId))

    return accounts.map(mapRowToLedgerAccountRecord)
  }

  async createMany(accounts: Array<LedgerAccountRecord>) {
    if (accounts.length === 0) {
      return []
    }

    const createdAccounts = await this.database
      .insert(schema.ledgerAccounts)
      .values(
        accounts.map((account) => ({
          id: account.id,
          companyId: account.companyId,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          systemKey: account.systemKey,
          isSystem: account.isSystem,
          createdAt: account.createdAt,
        })),
      )
      .returning()

    return createdAccounts.map(mapRowToLedgerAccountRecord)
  }
}

export function createLedgerAccountRepository(): LedgerAccountRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryLedgerAccountRepository()
  }

  return new DrizzleLedgerAccountRepository(database)
}

export const ledgerAccountRepository = createLedgerAccountRepository()
