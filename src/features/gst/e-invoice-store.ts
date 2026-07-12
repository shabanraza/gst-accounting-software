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
      this.records.find(
        (record) => record.salesInvoiceId === salesInvoiceId,
      ) ?? null
    )
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
      this.records.find(
        (record) => record.salesInvoiceId === salesInvoiceId,
      ) ?? null
    )
  }

  async create(record: EWayBillRecord) {
    this.records.push(record)
    return record
  }
}

export const eInvoiceRepository = new InMemoryEInvoiceRepository()
export const eWayBillRepository = new InMemoryEWayBillRepository()
