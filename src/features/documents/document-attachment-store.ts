import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  DocumentAttachmentRecord,
  DocumentAttachmentRepository,
} from '#/features/documents/document-attachment-service.ts'

export class InMemoryDocumentAttachmentRepository implements DocumentAttachmentRepository {
  private attachments: Array<DocumentAttachmentRecord> = []

  async create(attachment: DocumentAttachmentRecord) {
    this.attachments.push(attachment)
    return attachment
  }

  async findById(id: string) {
    return this.attachments.find((attachment) => attachment.id === id) ?? null
  }
}

type AttachmentRow = typeof schema.documentAttachments.$inferSelect

function mapRowToRecord(row: AttachmentRow): DocumentAttachmentRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    linkedDocumentType: row.linkedDocumentType,
    linkedDocumentId: row.linkedDocumentId,
    storageKey: row.storageKey,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  }
}

export class DrizzleDocumentAttachmentRepository implements DocumentAttachmentRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(attachment: DocumentAttachmentRecord) {
    const [created] = await this.database
      .insert(schema.documentAttachments)
      .values({
        id: attachment.id,
        companyId: attachment.companyId,
        linkedDocumentType: attachment.linkedDocumentType,
        linkedDocumentId: attachment.linkedDocumentId,
        storageKey: attachment.storageKey,
        originalFilename: attachment.originalFilename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      })
      .returning()

    return mapRowToRecord(created)
  }

  async findById(id: string) {
    const rows = await this.database
      .select()
      .from(schema.documentAttachments)
      .where(eq(schema.documentAttachments.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return mapRowToRecord(rows[0])
  }
}

export function createDocumentAttachmentRepository(): DocumentAttachmentRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryDocumentAttachmentRepository()
  }

  return new DrizzleDocumentAttachmentRepository(database)
}

export const documentAttachmentRepository = createDocumentAttachmentRepository()
