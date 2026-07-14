import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  LedgerEntryRecord,
  LedgerPostingRepository,
  VoucherType,
} from '#/features/accounting/posting-engine.ts'

export class InMemoryLedgerPostingRepository implements LedgerPostingRepository {
  private readonly entries: Array<LedgerEntryRecord> = []

  async createEntry(entry: LedgerEntryRecord) {
    this.entries.push(entry)
    return entry
  }

  async listByCompanyId(companyId: string) {
    return this.entries.filter((entry) => entry.companyId === companyId)
  }

  list() {
    return this.entries
  }
}

type LedgerEntryRow = typeof schema.ledgerEntries.$inferSelect
type LedgerLineRow = typeof schema.ledgerLines.$inferSelect

function mapRowsToLedgerEntryRecord(
  entry: LedgerEntryRow,
  lines: Array<LedgerLineRow>,
): LedgerEntryRecord {
  return {
    id: entry.id,
    companyId: entry.companyId,
    entryDate: entry.entryDate,
    narration: entry.narration,
    voucherType: entry.voucherType as VoucherType,
    totalDebit: entry.totalDebit,
    totalCredit: entry.totalCredit,
    createdAt: entry.createdAt,
    lines: lines.map((line) => ({
      id: line.id,
      companyId: line.companyId,
      entryId: line.entryId,
      ledgerAccountId: line.ledgerAccountId,
      debit: line.debit,
      credit: line.credit,
    })),
  }
}

export class DrizzleLedgerPostingRepository implements LedgerPostingRepository {
  constructor(private readonly database: AppDatabase) {}

  async createEntry(entry: LedgerEntryRecord) {
    // neon-http has no interactive transactions — insert entry then lines.
    const [createdEntry] = await this.database
      .insert(schema.ledgerEntries)
      .values({
        id: entry.id,
        companyId: entry.companyId,
        entryDate: entry.entryDate,
        narration: entry.narration,
        voucherType: entry.voucherType,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        createdAt: entry.createdAt,
      })
      .returning()

    const createdLines = await this.database
      .insert(schema.ledgerLines)
      .values(
        entry.lines.map((line) => ({
          id: line.id,
          companyId: line.companyId,
          entryId: line.entryId,
          ledgerAccountId: line.ledgerAccountId,
          debit: line.debit,
          credit: line.credit,
        })),
      )
      .returning()

    return mapRowsToLedgerEntryRecord(createdEntry, createdLines)
  }

  async listByCompanyId(companyId: string) {
    const [entries, lines] = await Promise.all([
      this.database
        .select()
        .from(schema.ledgerEntries)
        .where(eq(schema.ledgerEntries.companyId, companyId)),
      this.database
        .select()
        .from(schema.ledgerLines)
        .where(eq(schema.ledgerLines.companyId, companyId)),
    ])

    const linesByEntryId = new Map<string, Array<LedgerLineRow>>()
    for (const line of lines) {
      const existing = linesByEntryId.get(line.entryId) ?? []
      existing.push(line)
      linesByEntryId.set(line.entryId, existing)
    }

    return entries.map((entry) =>
      mapRowsToLedgerEntryRecord(entry, linesByEntryId.get(entry.id) ?? []),
    )
  }
}

export function createLedgerPostingRepository(): LedgerPostingRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryLedgerPostingRepository()
  }

  return new DrizzleLedgerPostingRepository(database)
}

export const ledgerPostingRepository = createLedgerPostingRepository()
