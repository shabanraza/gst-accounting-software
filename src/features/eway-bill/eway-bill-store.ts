import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  EWayBillRecord,
  EWayBillRepository,
  EWayBillSource,
  EWayBillTransportMode,
} from '#/features/eway-bill/eway-bill-service.ts'

function matchesSource(record: EWayBillRecord, source: EWayBillSource) {
  return source.kind === 'invoice'
    ? record.salesInvoiceId === source.id
    : record.salesDocumentId === source.id
}

export class InMemoryEWayBillRepository implements EWayBillRepository {
  private records: Array<EWayBillRecord> = []

  async findBySource(companyId: string, source: EWayBillSource) {
    const record = this.records.find(
      (row) => row.companyId === companyId && matchesSource(row, source),
    )
    return record ? structuredClone(record) : null
  }

  async listByCompanyId(companyId: string) {
    return this.records
      .filter((row) => row.companyId === companyId)
      .map((row) => structuredClone(row))
  }

  async save(record: EWayBillRecord) {
    this.records = [
      ...this.records.filter((row) => row.id !== record.id),
      structuredClone(record),
    ]
    return structuredClone(record)
  }

  async delete(companyId: string, id: string) {
    const before = this.records.length
    this.records = this.records.filter(
      (row) => !(row.companyId === companyId && row.id === id),
    )
    return this.records.length < before
  }
}

type EWayBillRow = typeof schema.eWayBills.$inferSelect

function mapRow(row: EWayBillRow): EWayBillRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    salesInvoiceId: row.salesInvoiceId,
    salesDocumentId: row.salesDocumentId,
    ewbNumber: row.ewbNumber,
    ewbDate: row.ewbDate,
    validUntil: row.validUntil,
    vehicleNumber: row.vehicleNumber,
    transportMode: row.transportMode as EWayBillTransportMode,
    distanceKm: row.distanceKm,
    transporterId: row.transporterId,
    transporterName: row.transporterName,
    generatedAt: row.generatedAt,
    updatedAt: row.updatedAt,
  }
}

export class DrizzleEWayBillRepository implements EWayBillRepository {
  constructor(private readonly database: AppDatabase) {}

  async findBySource(companyId: string, source: EWayBillSource) {
    const sourceColumn =
      source.kind === 'invoice'
        ? schema.eWayBills.salesInvoiceId
        : schema.eWayBills.salesDocumentId
    const rows = await this.database
      .select()
      .from(schema.eWayBills)
      .where(
        and(
          eq(schema.eWayBills.companyId, companyId),
          eq(sourceColumn, source.id),
        ),
      )
      .limit(1)
    return rows[0] ? mapRow(rows[0]) : null
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.eWayBills)
      .where(eq(schema.eWayBills.companyId, companyId))
    return rows.map(mapRow)
  }

  async save(record: EWayBillRecord) {
    const values = {
      id: record.id,
      companyId: record.companyId,
      salesInvoiceId: record.salesInvoiceId,
      salesDocumentId: record.salesDocumentId,
      ewbNumber: record.ewbNumber,
      ewbDate: record.ewbDate,
      validUntil: record.validUntil,
      vehicleNumber: record.vehicleNumber,
      transportMode: record.transportMode,
      distanceKm: record.distanceKm,
      transporterId: record.transporterId,
      transporterName: record.transporterName,
      generatedAt: record.generatedAt,
      updatedAt: record.updatedAt,
    }
    const [saved] = (await this.database
      .insert(schema.eWayBills)
      .values(values)
      .onConflictDoUpdate({
        // The source is the business key: a second save for the same invoice
        // or challan updates it, even when two saves race.
        target: record.salesInvoiceId
          ? schema.eWayBills.salesInvoiceId
          : schema.eWayBills.salesDocumentId,
        set: {
          ewbNumber: values.ewbNumber,
          ewbDate: values.ewbDate,
          validUntil: values.validUntil,
          vehicleNumber: values.vehicleNumber,
          transportMode: values.transportMode,
          distanceKm: values.distanceKm,
          transporterId: values.transporterId,
          transporterName: values.transporterName,
          updatedAt: values.updatedAt,
        },
        setWhere: eq(schema.eWayBills.companyId, record.companyId),
      })
      .returning()) as Array<EWayBillRow | undefined>
    if (!saved) throw new Error('E-way bill was not saved')
    return mapRow(saved)
  }

  async delete(companyId: string, id: string) {
    const rows = await this.database
      .delete(schema.eWayBills)
      .where(
        and(
          eq(schema.eWayBills.companyId, companyId),
          eq(schema.eWayBills.id, id),
        ),
      )
      .returning({ id: schema.eWayBills.id })
    return rows.length > 0
  }
}

export function createEWayBillRepository(): EWayBillRepository {
  const database = getDb()
  return database
    ? new DrizzleEWayBillRepository(database)
    : new InMemoryEWayBillRepository()
}
