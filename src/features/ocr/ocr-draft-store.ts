import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  OcrDraftFields,
  OcrDraftRecord,
  OcrDraftRepository,
  OcrDraftStatus,
} from '#/features/ocr/ocr-draft-service.ts'

export class InMemoryOcrDraftRepository implements OcrDraftRepository {
  private drafts: Array<OcrDraftRecord> = []

  async create(draft: OcrDraftRecord) {
    this.drafts.push(draft)
    return draft
  }

  async findById(id: string) {
    return this.drafts.find((draft) => draft.id === id) ?? null
  }

  async save(draft: OcrDraftRecord) {
    const index = this.drafts.findIndex((item) => item.id === draft.id)
    if (index >= 0) {
      this.drafts[index] = draft
    }
    return draft
  }

  async listByCompanyId(companyId: string) {
    return this.drafts.filter((draft) => draft.companyId === companyId)
  }
}

type DraftRow = typeof schema.ocrDrafts.$inferSelect

function mapRowToRecord(row: DraftRow): OcrDraftRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    attachmentId: row.attachmentId,
    status: row.status as OcrDraftStatus,
    fields: JSON.parse(row.fieldsJson) as OcrDraftFields,
    lowConfidenceFields: JSON.parse(
      row.lowConfidenceFieldsJson,
    ) as OcrDraftRecord['lowConfidenceFields'],
    postedPurchaseBillId: row.postedPurchaseBillId,
    reviewedByUserId: row.reviewedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class DrizzleOcrDraftRepository implements OcrDraftRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(draft: OcrDraftRecord) {
    const [created] = await this.database
      .insert(schema.ocrDrafts)
      .values({
        id: draft.id,
        companyId: draft.companyId,
        attachmentId: draft.attachmentId,
        status: draft.status,
        fieldsJson: JSON.stringify(draft.fields),
        lowConfidenceFieldsJson: JSON.stringify(draft.lowConfidenceFields),
        postedPurchaseBillId: draft.postedPurchaseBillId,
        reviewedByUserId: draft.reviewedByUserId,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })
      .returning()

    return mapRowToRecord(created)
  }

  async findById(id: string) {
    const rows = await this.database
      .select()
      .from(schema.ocrDrafts)
      .where(eq(schema.ocrDrafts.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return mapRowToRecord(rows[0])
  }

  async save(draft: OcrDraftRecord) {
    const [saved] = await this.database
      .update(schema.ocrDrafts)
      .set({
        status: draft.status,
        fieldsJson: JSON.stringify(draft.fields),
        lowConfidenceFieldsJson: JSON.stringify(draft.lowConfidenceFields),
        postedPurchaseBillId: draft.postedPurchaseBillId,
        reviewedByUserId: draft.reviewedByUserId,
        updatedAt: draft.updatedAt,
      })
      .where(eq(schema.ocrDrafts.id, draft.id))
      .returning()

    return mapRowToRecord(saved)
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.ocrDrafts)
      .where(eq(schema.ocrDrafts.companyId, companyId))

    return rows.map(mapRowToRecord)
  }
}

export function createOcrDraftRepository(): OcrDraftRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryOcrDraftRepository()
  }

  return new DrizzleOcrDraftRepository(database)
}

export const ocrDraftRepository = createOcrDraftRepository()
