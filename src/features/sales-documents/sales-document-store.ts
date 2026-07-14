import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  SalesDocumentLineInput,
  SalesDocumentRecord,
  SalesDocumentRepository,
  SalesDocumentType,
} from '#/features/sales-documents/sales-document-service.ts'

export class InMemorySalesDocumentRepository
  implements SalesDocumentRepository
{
  private readonly documents: Array<SalesDocumentRecord> = []

  async create(document: SalesDocumentRecord) {
    this.documents.push(document)
    return document
  }

  async listByCompanyId(companyId: string) {
    return this.documents.filter(
      (document) => document.companyId === companyId,
    )
  }

  async findById(companyId: string, documentId: string) {
    return (
      this.documents.find(
        (document) =>
          document.companyId === companyId && document.id === documentId,
      ) ?? null
    )
  }

  async markConverted(companyId: string, documentId: string, invoiceId: string) {
    const document = await this.findById(companyId, documentId)

    if (!document) {
      throw new Error(`Sales document not found: ${documentId}`)
    }

    document.status = 'converted'
    document.convertedToInvoiceId = invoiceId
    return document
  }
}

type DocumentRow = typeof schema.salesDocuments.$inferSelect
type LineRow = typeof schema.salesDocumentLines.$inferSelect

function mapLineRow(row: LineRow): SalesDocumentLineInput {
  return {
    itemId: row.itemId,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    rate: row.rate,
  }
}

function mapDocumentRow(
  row: DocumentRow,
  lines: Array<SalesDocumentLineInput>,
): SalesDocumentRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    documentType: row.documentType as SalesDocumentType,
    documentNumber: row.documentNumber,
    documentDate: row.documentDate,
    customerId: row.customerId,
    narration: row.narration,
    totalAmount: row.totalAmount,
    status: row.status as SalesDocumentRecord['status'],
    convertedToInvoiceId: row.convertedToInvoiceId ?? null,
    lines,
    createdAt: row.createdAt,
  }
}

export class DrizzleSalesDocumentRepository implements SalesDocumentRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(document: SalesDocumentRecord) {
    await this.database.insert(schema.salesDocuments).values({
      id: document.id,
      companyId: document.companyId,
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      documentDate: document.documentDate,
      customerId: document.customerId,
      narration: document.narration,
      totalAmount: document.totalAmount,
      status: document.status,
      convertedToInvoiceId: document.convertedToInvoiceId,
      createdAt: document.createdAt,
    })

    if (document.lines.length > 0) {
      await this.database.insert(schema.salesDocumentLines).values(
        document.lines.map((line) => ({
          id: crypto.randomUUID(),
          salesDocumentId: document.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
        })),
      )
    }

    return document
  }

  async listByCompanyId(companyId: string) {
    const documents = await this.database
      .select()
      .from(schema.salesDocuments)
      .where(eq(schema.salesDocuments.companyId, companyId))

    const results: Array<SalesDocumentRecord> = []
    for (const document of documents) {
      const lines = await this.database
        .select()
        .from(schema.salesDocumentLines)
        .where(eq(schema.salesDocumentLines.salesDocumentId, document.id))

      results.push(mapDocumentRow(document, lines.map(mapLineRow)))
    }

    return results
  }

  async findById(companyId: string, documentId: string) {
    const documents = await this.database
      .select()
      .from(schema.salesDocuments)
      .where(
        and(
          eq(schema.salesDocuments.companyId, companyId),
          eq(schema.salesDocuments.id, documentId),
        ),
      )
      .limit(1)

    if (documents.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.salesDocumentLines)
      .where(eq(schema.salesDocumentLines.salesDocumentId, documentId))

    return mapDocumentRow(documents[0], lines.map(mapLineRow))
  }

  async markConverted(companyId: string, documentId: string, invoiceId: string) {
    const updatedRows = await this.database
      .update(schema.salesDocuments)
      .set({
        status: 'converted',
        convertedToInvoiceId: invoiceId,
      })
      .where(
        and(
          eq(schema.salesDocuments.companyId, companyId),
          eq(schema.salesDocuments.id, documentId),
        ),
      )
      .returning()

    if (updatedRows.length === 0) {
      throw new Error(`Sales document not found: ${documentId}`)
    }

    const updated = updatedRows[0]

    const lines = await this.database
      .select()
      .from(schema.salesDocumentLines)
      .where(eq(schema.salesDocumentLines.salesDocumentId, documentId))

    return mapDocumentRow(updated, lines.map(mapLineRow))
  }
}

export function createSalesDocumentRepository(): SalesDocumentRepository {
  const database = getDb()
  if (!database) {
    return new InMemorySalesDocumentRepository()
  }

  return new DrizzleSalesDocumentRepository(database)
}

export const salesDocumentRepository = createSalesDocumentRepository()
