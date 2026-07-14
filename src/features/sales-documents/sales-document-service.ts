import Decimal from 'decimal.js'

import type { ItemRepository } from '#/features/inventory/item-service.ts'

export type SalesDocumentType = 'quotation' | 'sales_order' | 'delivery_challan'
export type SalesDocumentStatus = 'open' | 'converted'

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

export class InvalidSalesDocumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidSalesDocumentError'
  }
}

export class SalesDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Sales document not found: ${documentId}`)
    this.name = 'SalesDocumentNotFoundError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function createSalesDocument(
  repository: SalesDocumentRepository,
  input: CreateSalesDocumentInput,
): Promise<SalesDocumentRecord> {
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

  return repository.create({
    ...input,
    narration: input.narration?.trim() ?? '',
    id: crypto.randomUUID(),
    totalAmount,
    status: 'open',
    convertedToInvoiceId: null,
    createdAt: new Date(),
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
