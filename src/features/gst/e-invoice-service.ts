export type EInvoiceRecord = {
  id: string
  companyId: string
  salesInvoiceId: string
  irn: string
  ackNumber: string
  ackDate: string
  qrCodeData: string
  generatedAt: Date
}

export interface EInvoiceRepository {
  findBySalesInvoiceId: (
    salesInvoiceId: string,
  ) => Promise<EInvoiceRecord | null>
  create: (record: EInvoiceRecord) => Promise<EInvoiceRecord>
}

export class EInvoiceAlreadyGeneratedError extends Error {
  constructor(salesInvoiceId: string) {
    super(`An e-invoice already exists for sales invoice: ${salesInvoiceId}`)
    this.name = 'EInvoiceAlreadyGeneratedError'
  }
}

function pseudoHash(input: string): string {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export async function generateEInvoice(
  repository: EInvoiceRepository,
  input: { companyId: string; salesInvoiceId: string; totalAmount: string },
): Promise<EInvoiceRecord> {
  const existing = await repository.findBySalesInvoiceId(input.salesInvoiceId)

  if (existing) {
    throw new EInvoiceAlreadyGeneratedError(input.salesInvoiceId)
  }

  const now = new Date()
  const seed = `${input.companyId}:${input.salesInvoiceId}:${input.totalAmount}`
  const irn = `${pseudoHash(seed)}${pseudoHash(seed + '1')}${pseudoHash(seed + '2')}${pseudoHash(seed + '3')}`.slice(0, 64)
  const ackNumber = pseudoHash(seed + 'ack').padStart(12, '0').slice(0, 12)

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    salesInvoiceId: input.salesInvoiceId,
    irn,
    ackNumber,
    ackDate: now.toISOString().slice(0, 10),
    qrCodeData: `IRN:${irn}|AMT:${input.totalAmount}`,
    generatedAt: now,
  })
}

export type EWayBillRecord = {
  id: string
  companyId: string
  salesInvoiceId: string
  ewbNumber: string
  ewbDate: string
  vehicleNumber: string | null
  validUntil: string
  generatedAt: Date
}

export interface EWayBillRepository {
  findBySalesInvoiceId: (
    salesInvoiceId: string,
  ) => Promise<EWayBillRecord | null>
  create: (record: EWayBillRecord) => Promise<EWayBillRecord>
}

export class EWayBillAlreadyGeneratedError extends Error {
  constructor(salesInvoiceId: string) {
    super(`An e-way bill already exists for sales invoice: ${salesInvoiceId}`)
    this.name = 'EWayBillAlreadyGeneratedError'
  }
}

export async function generateEWayBill(
  repository: EWayBillRepository,
  input: {
    companyId: string
    salesInvoiceId: string
    vehicleNumber?: string | null
  },
): Promise<EWayBillRecord> {
  const existing = await repository.findBySalesInvoiceId(input.salesInvoiceId)

  if (existing) {
    throw new EWayBillAlreadyGeneratedError(input.salesInvoiceId)
  }

  const now = new Date()
  const seed = `${input.companyId}:${input.salesInvoiceId}`
  const ewbNumber = pseudoHash(seed).padStart(12, '0').slice(0, 12)
  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    salesInvoiceId: input.salesInvoiceId,
    ewbNumber,
    ewbDate: now.toISOString().slice(0, 10),
    vehicleNumber: input.vehicleNumber ?? null,
    validUntil: validUntil.toISOString().slice(0, 10),
    generatedAt: now,
  })
}
