import { DomainError } from '#/lib/domain-error.ts'
import Decimal from 'decimal.js'

import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'

import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'

export type SalesDocumentType = 'quotation' | 'sales_order' | 'delivery_challan'
export type SalesDocumentStatus = 'open' | 'converted'

// Same series the mobile app allocates from, so both share one counter.
const salesDocumentNumberPrefixes: Record<SalesDocumentType, string> = {
  quotation: 'QT',
  sales_order: 'SO',
  delivery_challan: 'DC',
}

export type SalesDocumentLineInput = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
}

export type CreateSalesDocumentInput = {
  companyId: string
  documentType: SalesDocumentType
  documentNumber: string
  documentDate: string
  customerId: string
  narration?: string
  lines: Array<SalesDocumentLineInput>
}

export type CreateSalesDocumentRequest = Omit<
  CreateSalesDocumentInput,
  'documentNumber'
> & {
  /** Left blank, the next number in the company's per-type series is used. */
  documentNumber?: string
  financialYearId?: string
}

export type SalesDocumentRecord = CreateSalesDocumentInput & {
  id: string
  narration: string
  totalAmount: string
  status: SalesDocumentStatus
  convertedToInvoiceId: string | null
  createdAt: Date
}

export type SalesInvoiceDraftFromDocument = {
  sourceDocumentId: string
  customerId: string
  documentDate: string
  narration: string
  lines: Array<{
    itemId: string
    itemName: string
    hsnCode: string
    gstRate: string
    quantity: string
    unit: string
    rate: string
  }>
}

export interface SalesDocumentRepository {
  create: (document: SalesDocumentRecord) => Promise<SalesDocumentRecord>
  listByCompanyId: (companyId: string) => Promise<Array<SalesDocumentRecord>>
  findById: (
    companyId: string,
    documentId: string,
  ) => Promise<SalesDocumentRecord | null>
  markConverted: (
    companyId: string,
    documentId: string,
    invoiceId: string,
  ) => Promise<SalesDocumentRecord>
}

export class InvalidSalesDocumentError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidSalesDocumentError'
  }
}

export class SalesDocumentNotFoundError extends DomainError {
  constructor(documentId: string) {
    super(`Sales document not found: ${documentId}`)
    this.name = 'SalesDocumentNotFoundError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function createSalesDocument(
  repository: SalesDocumentRepository,
  sequences: DocumentSequenceRepository,
  request: CreateSalesDocumentRequest,
): Promise<SalesDocumentRecord> {
  const { financialYearId, ...input } = request

  if (input.lines.length === 0) {
    throw new InvalidSalesDocumentError(
      'A sales document requires at least one line',
    )
  }

  const totalAmount = input.lines
    .reduce(
      (sum, line) => sum.plus(new Decimal(line.quantity).mul(line.rate)),
      new Decimal(0),
    )
    .toFixed(2)

  const documentNumber =
    input.documentNumber?.trim() ||
    (await allocateSalesDocumentNumber(sequences, input, financialYearId))

  return repository.create({
    ...input,
    documentNumber,
    narration: input.narration?.trim() ?? '',
    id: crypto.randomUUID(),
    totalAmount,
    status: 'open',
    convertedToInvoiceId: null,
    createdAt: new Date(),
  })
}

function allocateSalesDocumentNumber(
  sequences: DocumentSequenceRepository,
  input: { companyId: string; documentType: SalesDocumentType },
  financialYearId: string | undefined,
) {
  if (!financialYearId) {
    throw new InvalidSalesDocumentError(
      'Set up a financial year before creating sales documents',
    )
  }

  return nextDocumentNumber(sequences, {
    companyId: input.companyId,
    financialYearId,
    voucherType: 'sales',
    series: salesDocumentNumberPrefixes[input.documentType],
    padLength: 4,
  })
}

export async function listSalesDocumentsByCompany(
  repository: SalesDocumentRepository,
  companyId: string,
  documentType?: SalesDocumentType,
): Promise<Array<SalesDocumentRecord>> {
  const documents = await repository.listByCompanyId(companyId)

  return documentType
    ? documents.filter((document) => document.documentType === documentType)
    : documents
}

export async function getSalesDocumentById(
  repository: SalesDocumentRepository,
  companyId: string,
  documentId: string,
): Promise<SalesDocumentRecord> {
  const document = await repository.findById(companyId, documentId)

  if (!document) {
    throw new SalesDocumentNotFoundError(documentId)
  }

  return document
}

export async function buildSalesInvoiceDraftFromDocument(
  documentRepository: SalesDocumentRepository,
  itemRepository: ItemRepository,
  companyId: string,
  documentId: string,
): Promise<SalesInvoiceDraftFromDocument> {
  const document = await getSalesDocumentById(
    documentRepository,
    companyId,
    documentId,
  )

  if (document.status === 'converted') {
    throw new InvalidSalesDocumentError(
      'This sales document has already been converted to an invoice',
    )
  }

  const items = await itemRepository.listByCompanyId(companyId)
  const itemById = new Map(items.map((item) => [item.id, item]))

  const lines = document.lines.map((line) => {
    const item = itemById.get(line.itemId)

    if (!item) {
      throw new InvalidSalesDocumentError(
        `Item not found for document line: ${line.itemId}`,
      )
    }

    return {
      itemId: line.itemId,
      itemName: line.description || item.name,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
    }
  })

  return {
    sourceDocumentId: document.id,
    customerId: document.customerId,
    documentDate: document.documentDate,
    narration: document.narration,
    lines,
  }
}

export async function markSalesDocumentConverted(
  repository: SalesDocumentRepository,
  companyId: string,
  documentId: string,
  invoiceId: string,
): Promise<SalesDocumentRecord> {
  return repository.markConverted(companyId, documentId, invoiceId)
}
