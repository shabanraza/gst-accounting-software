import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  OpeningBalanceSide,
  PartyOpeningBalanceRecord,
  PartyOpeningBalanceRepository,
} from '#/features/parties/party-opening-balance-service.ts'

export class InMemoryPartyOpeningBalanceRepository implements PartyOpeningBalanceRepository {
  private records: Array<PartyOpeningBalanceRecord> = []

  async findById(companyId: string, id: string) {
    const record = this.records.find(
      (row) => row.companyId === companyId && row.id === id,
    )
    return record ? structuredClone(record) : null
  }

  async lockById(companyId: string, id: string) {
    return this.findById(companyId, id)
  }

  async findByPartyId(companyId: string, partyId: string) {
    const record = this.records.find(
      (row) => row.companyId === companyId && row.partyId === partyId,
    )
    return record ? structuredClone(record) : null
  }

  async listByCompanyId(companyId: string) {
    return this.records
      .filter((row) => row.companyId === companyId)
      .map((row) => structuredClone(row))
  }

  async save(record: PartyOpeningBalanceRecord) {
    const index = this.records.findIndex(
      (row) => row.companyId === record.companyId && row.id === record.id,
    )
    if (index >= 0) {
      this.records[index] = structuredClone(record)
    } else {
      this.records.push(structuredClone(record))
    }
    return record
  }

  async delete(companyId: string, id: string) {
    this.records = this.records.filter(
      (row) => !(row.companyId === companyId && row.id === id),
    )
  }
}

type Row = typeof schema.partyOpeningBalances.$inferSelect

function mapRow(row: Row): PartyOpeningBalanceRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    partyId: row.partyId,
    side: row.side as OpeningBalanceSide,
    asOfDate: row.asOfDate,
    amount: row.amount,
    outstandingAmount: row.outstandingAmount,
    partyAccountId: row.partyAccountId,
    ledgerEntryId: row.ledgerEntryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class DrizzlePartyOpeningBalanceRepository implements PartyOpeningBalanceRepository {
  constructor(private readonly database: AppDatabase) {}

  async findById(companyId: string, id: string) {
    return this.load(companyId, id, false)
  }

  async lockById(companyId: string, id: string) {
    return this.load(companyId, id, true)
  }

  private async load(companyId: string, id: string, lock: boolean) {
    const query = this.database
      .select()
      .from(schema.partyOpeningBalances)
      .where(
        and(
          eq(schema.partyOpeningBalances.companyId, companyId),
          eq(schema.partyOpeningBalances.id, id),
        ),
      )
      .limit(1)
    const rows = await (lock ? query.for('update') : query)
    return rows.length > 0 ? mapRow(rows[0]) : null
  }

  async findByPartyId(companyId: string, partyId: string) {
    const rows = await this.database
      .select()
      .from(schema.partyOpeningBalances)
      .where(
        and(
          eq(schema.partyOpeningBalances.companyId, companyId),
          eq(schema.partyOpeningBalances.partyId, partyId),
        ),
      )
      .limit(1)
    return rows.length > 0 ? mapRow(rows[0]) : null
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.partyOpeningBalances)
      .where(eq(schema.partyOpeningBalances.companyId, companyId))
    return rows.map(mapRow)
  }

  async save(record: PartyOpeningBalanceRecord) {
    const values = {
      id: record.id,
      companyId: record.companyId,
      partyId: record.partyId,
      side: record.side,
      asOfDate: record.asOfDate,
      amount: record.amount,
      outstandingAmount: record.outstandingAmount,
      partyAccountId: record.partyAccountId,
      ledgerEntryId: record.ledgerEntryId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    await this.database
      .insert(schema.partyOpeningBalances)
      .values(values)
      .onConflictDoUpdate({
        target: schema.partyOpeningBalances.id,
        set: {
          side: values.side,
          asOfDate: values.asOfDate,
          amount: values.amount,
          outstandingAmount: values.outstandingAmount,
          partyAccountId: values.partyAccountId,
          ledgerEntryId: values.ledgerEntryId,
          updatedAt: values.updatedAt,
        },
      })
    return record
  }

  async delete(companyId: string, id: string) {
    await this.database
      .delete(schema.partyOpeningBalances)
      .where(
        and(
          eq(schema.partyOpeningBalances.companyId, companyId),
          eq(schema.partyOpeningBalances.id, id),
        ),
      )
  }
}

export function createPartyOpeningBalanceRepository(): PartyOpeningBalanceRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPartyOpeningBalanceRepository()
  }
  return new DrizzlePartyOpeningBalanceRepository(database)
}

export const partyOpeningBalanceRepository =
  createPartyOpeningBalanceRepository()
