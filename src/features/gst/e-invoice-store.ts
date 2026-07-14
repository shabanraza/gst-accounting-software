import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  EInvoiceRecord,
  EInvoiceRepository,
  EWayBillRecord,
  EWayBillRepository,
} from '#/features/gst/e-invoice-service.ts'

export class InMemoryEInvoiceRepository implements EInvoiceRepository {
  private readonly records: Array<EInvoiceRecord> = []

  async findBySalesInvoiceId(salesInvoiceId: string) {
    return (
      this.records.find((record) => record.salesInvoiceId === salesInvoiceId) ??
      null
    )
  }

  async listByCompanyId(companyId: string) {
    return this.records.filter((record) => record.companyId === companyId)
  }

  async create(record: EInvoiceRecord) {
    this.records.push(record)
    return record
  }
}

export class InMemoryEWayBillRepository implements EWayBillRepository {
  private readonly records: Array<EWayBillRecord> = []

  async findBySalesInvoiceId(salesInvoiceId: string) {
    return (
      this.records.find((record) => record.salesInvoiceId === salesInvoiceId) ??
      null
    )
  }

  async listByCompanyId(companyId: string) {
    return this.records.filter((record) => record.companyId === companyId)
  }

  async create(record: EWayBillRecord) {
    this.records.push(record)
    return record
  }
}

type EInvoiceRow = typeof schema.eInvoices.$inferSelect
type EWayBillRow = typeof schema.eWayBills.$inferSelect

function mapEInvoiceRow(row: EInvoiceRow): EInvoiceRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    salesInvoiceId: row.salesInvoiceId,
    irn: row.irn,
    ackNumber: row.ackNumber,
    ackDate: row.ackDate,
    qrCodeData: row.qrCodeData,
    generatedAt: row.generatedAt,
  }
}

function mapEWayBillRow(row: EWayBillRow): EWayBillRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    salesInvoiceId: row.salesInvoiceId,
    ewbNumber: row.ewbNumber,
    ewbDate: row.ewbDate,
    vehicleNumber: row.vehicleNumber,
    validUntil: row.validUntil,
    generatedAt: row.generatedAt,
  }
}

export class DrizzleEInvoiceRepository implements EInvoiceRepository {
  constructor(private readonly database: AppDatabase) {}

  async findBySalesInvoiceId(salesInvoiceId: string) {
    const rows = await this.database
      .select()
      .from(schema.eInvoices)
      .where(eq(schema.eInvoices.salesInvoiceId, salesInvoiceId))
      .limit(1)

    if (rows.length === 0) return null
    return mapEInvoiceRow(rows[0])
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.eInvoices)
      .where(eq(schema.eInvoices.companyId, companyId))

    return rows.map(mapEInvoiceRow)
  }

  async create(record: EInvoiceRecord) {
    const [created] = await this.database
      .insert(schema.eInvoices)
      .values({
        id: record.id,
        companyId: record.companyId,
        salesInvoiceId: record.salesInvoiceId,
        irn: record.irn,
        ackNumber: record.ackNumber,
        ackDate: record.ackDate,
        qrCodeData: record.qrCodeData,
        generatedAt: record.generatedAt,
      })
      .returning()

    return mapEInvoiceRow(created)
  }
}

export class DrizzleEWayBillRepository implements EWayBillRepository {
  constructor(private readonly database: AppDatabase) {}

  async findBySalesInvoiceId(salesInvoiceId: string) {
    const rows = await this.database
      .select()
      .from(schema.eWayBills)
      .where(eq(schema.eWayBills.salesInvoiceId, salesInvoiceId))
      .limit(1)

    if (rows.length === 0) return null
    return mapEWayBillRow(rows[0])
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.eWayBills)
      .where(eq(schema.eWayBills.companyId, companyId))

    return rows.map(mapEWayBillRow)
  }

  async create(record: EWayBillRecord) {
    const [created] = await this.database
      .insert(schema.eWayBills)
      .values({
        id: record.id,
        companyId: record.companyId,
        salesInvoiceId: record.salesInvoiceId,
        ewbNumber: record.ewbNumber,
        ewbDate: record.ewbDate,
        vehicleNumber: record.vehicleNumber,
        validUntil: record.validUntil,
        generatedAt: record.generatedAt,
      })
      .returning()

    return mapEWayBillRow(created)
  }
}

export function createEInvoiceRepository(): EInvoiceRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryEInvoiceRepository()
  }

  return new DrizzleEInvoiceRepository(database)
}

export function createEWayBillRepository(): EWayBillRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryEWayBillRepository()
  }

  return new DrizzleEWayBillRepository(database)
}

export const eInvoiceRepository = createEInvoiceRepository()
export const eWayBillRepository = createEWayBillRepository()
