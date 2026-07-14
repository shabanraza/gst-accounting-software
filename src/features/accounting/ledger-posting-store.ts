import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'

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

  async listByCompanyId(
    companyId: string,
    options?: { startDate?: string; endDate?: string },
  ) {
    return this.entries.filter((entry) => {
      if (entry.companyId !== companyId) return false
      if (options?.startDate && entry.entryDate < options.startDate)
        return false
      if (options?.endDate && entry.entryDate > options.endDate) return false
      return true
    })
  }

  async sumByAccount(
    companyId: string,
    options?: { startDate?: string; endDate?: string },
  ) {
    const entries = await this.listByCompanyId(companyId, options)
    const totals = new Map<string, { debit: string; credit: string }>()
    for (const entry of entries) {
      for (const line of entry.lines) {
        const existing = totals.get(line.ledgerAccountId) ?? {
          debit: '0',
          credit: '0',
        }
        totals.set(line.ledgerAccountId, {
          debit: (Number(existing.debit) + Number(line.debit)).toFixed(2),
          credit: (Number(existing.credit) + Number(line.credit)).toFixed(2),
        })
      }
    }
    return totals
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

  async listByCompanyId(
    companyId: string,
    options?: { startDate?: string; endDate?: string },
  ) {
    const entryConditions = [eq(schema.ledgerEntries.companyId, companyId)]
    if (options?.startDate) {
      entryConditions.push(
        gte(schema.ledgerEntries.entryDate, options.startDate),
      )
    }
    if (options?.endDate) {
      entryConditions.push(lte(schema.ledgerEntries.entryDate, options.endDate))
    }

    const entries = await this.database
      .select()
      .from(schema.ledgerEntries)
      .where(and(...entryConditions))

    if (entries.length === 0) {
      return []
    }

    const entryIds = entries.map((entry) => entry.id)
    const lines = await this.database
      .select()
      .from(schema.ledgerLines)
      .where(
        and(
          eq(schema.ledgerLines.companyId, companyId),
          inArray(schema.ledgerLines.entryId, entryIds),
        ),
      )

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

  async sumByAccount(
    companyId: string,
    options?: { startDate?: string; endDate?: string },
  ) {
    const conditions = [eq(schema.ledgerLines.companyId, companyId)]

    if (options?.startDate || options?.endDate) {
      const entryConditions = [eq(schema.ledgerEntries.companyId, companyId)]
      if (options.startDate) {
        entryConditions.push(
          gte(schema.ledgerEntries.entryDate, options.startDate),
        )
      }
      if (options.endDate) {
        entryConditions.push(
          lte(schema.ledgerEntries.entryDate, options.endDate),
        )
      }

      const entries = await this.database
        .select({ id: schema.ledgerEntries.id })
        .from(schema.ledgerEntries)
        .where(and(...entryConditions))

      if (entries.length === 0) {
        return new Map()
      }

      conditions.push(
        inArray(
          schema.ledgerLines.entryId,
          entries.map((entry) => entry.id),
        ),
      )
    }

    const rows = await this.database
      .select({
        ledgerAccountId: schema.ledgerLines.ledgerAccountId,
        debit: sql<string>`coalesce(sum(${schema.ledgerLines.debit}::numeric), 0)`,
        credit: sql<string>`coalesce(sum(${schema.ledgerLines.credit}::numeric), 0)`,
      })
      .from(schema.ledgerLines)
      .where(and(...conditions))
      .groupBy(schema.ledgerLines.ledgerAccountId)

    const totals = new Map<string, { debit: string; credit: string }>()
    for (const row of rows) {
      totals.set(row.ledgerAccountId, {
        debit: Number(row.debit).toFixed(2),
        credit: Number(row.credit).toFixed(2),
      })
    }
    return totals
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
