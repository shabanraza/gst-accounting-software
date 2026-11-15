import { and, desc, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  RecurringFrequency,
  RecurringInvoiceRecord,
  RecurringInvoiceRepository,
  RecurringInvoiceTemplate,
  RecurringStatus,
} from '#/features/sales/recurring-invoice-service.ts'

export class InMemoryRecurringInvoiceRepository implements RecurringInvoiceRepository {
  private records: Array<RecurringInvoiceRecord> = []

  async findById(companyId: string, id: string) {
    const record = this.records.find(
      (row) => row.companyId === companyId && row.id === id,
    )
    return record ? structuredClone(record) : null
  }

  async lockById(companyId: string, id: string) {
    return this.findById(companyId, id)
  }

  async listByCompanyId(companyId: string) {
    return this.records
      .filter((row) => row.companyId === companyId)
      .map((row) => structuredClone(row))
  }

  async save(record: RecurringInvoiceRecord) {
    const index = this.records.findIndex(
      (row) => row.companyId === record.companyId && row.id === record.id,
    )
    if (index >= 0) {
      this.records[index] = structuredClone(record)
    } else {
      this.records.push(structuredClone(record))
    }
    return structuredClone(record)
  }
}

type Row = typeof schema.recurringInvoices.$inferSelect

function mapRow(row: Row): RecurringInvoiceRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    customerId: row.customerId,
    customerName: row.customerName,
    sourceInvoiceId: row.sourceInvoiceId,
    frequency: row.frequency as RecurringFrequency,
    startDate: row.startDate,
    nextRunDate: row.nextRunDate,
    endDate: row.endDate,
    dueDays: row.dueDays,
    status: row.status as RecurringStatus,
    totalAmount: row.totalAmount,
    template: row.template as RecurringInvoiceTemplate,
    lastInvoiceId: row.lastInvoiceId,
    lastInvoiceNumber: row.lastInvoiceNumber,
    generatedCount: row.generatedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class DrizzleRecurringInvoiceRepository implements RecurringInvoiceRepository {
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
      .from(schema.recurringInvoices)
      .where(
        and(
          eq(schema.recurringInvoices.companyId, companyId),
          eq(schema.recurringInvoices.id, id),
        ),
      )
      .limit(1)
    const rows = await (lock ? query.for('update') : query)
    return rows.length > 0 ? mapRow(rows[0]) : null
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.recurringInvoices)
      .where(eq(schema.recurringInvoices.companyId, companyId))
      .orderBy(desc(schema.recurringInvoices.createdAt))
    return rows.map(mapRow)
  }

  async save(record: RecurringInvoiceRecord) {
    const values = {
      id: record.id,
      companyId: record.companyId,
      customerId: record.customerId,
      customerName: record.customerName,
      sourceInvoiceId: record.sourceInvoiceId,
      frequency: record.frequency,
      startDate: record.startDate,
      nextRunDate: record.nextRunDate,
      endDate: record.endDate,
      dueDays: record.dueDays,
      status: record.status,
      totalAmount: record.totalAmount,
      template: record.template,
      lastInvoiceId: record.lastInvoiceId,
      lastInvoiceNumber: record.lastInvoiceNumber,
      generatedCount: record.generatedCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    const {
      id: _id,
      companyId: _companyId,
      createdAt: _createdAt,
      ...changes
    } = values
    const rows = await this.database
      .insert(schema.recurringInvoices)
      .values(values)
      .onConflictDoUpdate({ target: schema.recurringInvoices.id, set: changes })
      .returning()
    return mapRow(rows[0])
  }
}

export function createRecurringInvoiceRepository(): RecurringInvoiceRepository {
  const database = getDb()
  return database
    ? new DrizzleRecurringInvoiceRepository(database)
    : new InMemoryRecurringInvoiceRepository()
}
