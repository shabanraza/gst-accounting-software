import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  CreditDebitNoteRecord,
  CreditDebitNoteRepository,
  CreditDebitNoteType,
} from '#/features/returns/credit-debit-note-service.ts'

export class InMemoryCreditDebitNoteRepository implements CreditDebitNoteRepository {
  private readonly notes: Array<CreditDebitNoteRecord> = []

  async create(note: CreditDebitNoteRecord) {
    this.notes.push(note)
    return note
  }

  async listByCompanyId(companyId: string) {
    return this.notes.filter((note) => note.companyId === companyId)
  }
}

type CreditDebitNoteRow = typeof schema.creditDebitNotes.$inferSelect

function mapRowToCreditDebitNoteRecord(
  row: CreditDebitNoteRow,
): CreditDebitNoteRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    noteType: row.noteType as CreditDebitNoteType,
    noteNumber: row.noteNumber,
    noteDate: row.noteDate,
    partyId: row.partyId,
    referenceDocumentId: row.referenceDocumentId,
    taxableAmount: row.taxableAmount,
    totalGstAmount: row.totalGstAmount,
    totalAmount: row.totalAmount,
    ledgerEntryId: row.ledgerEntryId,
    narration: row.narration,
    createdAt: row.createdAt,
  }
}

export class DrizzleCreditDebitNoteRepository implements CreditDebitNoteRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(note: CreditDebitNoteRecord) {
    const [createdNote] = await this.database
      .insert(schema.creditDebitNotes)
      .values({
        id: note.id,
        companyId: note.companyId,
        noteType: note.noteType,
        noteNumber: note.noteNumber,
        noteDate: note.noteDate,
        partyId: note.partyId,
        referenceDocumentId: note.referenceDocumentId,
        taxableAmount: note.taxableAmount,
        totalGstAmount: note.totalGstAmount,
        totalAmount: note.totalAmount,
        ledgerEntryId: note.ledgerEntryId,
        narration: note.narration,
        createdAt: note.createdAt,
      })
      .returning()

    return mapRowToCreditDebitNoteRecord(createdNote)
  }

  async listByCompanyId(companyId: string) {
    const notes = await this.database
      .select()
      .from(schema.creditDebitNotes)
      .where(eq(schema.creditDebitNotes.companyId, companyId))

    return notes.map(mapRowToCreditDebitNoteRecord)
  }
}

export function createCreditDebitNoteRepository(): CreditDebitNoteRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryCreditDebitNoteRepository()
  }

  return new DrizzleCreditDebitNoteRepository(database)
}

export const creditDebitNoteRepository = createCreditDebitNoteRepository()
