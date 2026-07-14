import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  DocumentSequenceRecord,
  DocumentSequenceRepository,
} from '#/features/documents/document-sequence-service.ts'

export class InMemoryDocumentSequenceRepository
  implements DocumentSequenceRepository
{
  private sequences: Array<DocumentSequenceRecord> = []

  async findForUpdate(input: {
    companyId: string
    financialYearId: string
    voucherType: string
    series: string
  }) {
    return (
      this.sequences.find(
        (sequence) =>
          sequence.companyId === input.companyId &&
          sequence.financialYearId === input.financialYearId &&
          sequence.voucherType === input.voucherType &&
          sequence.series === input.series,
      ) ?? null
    )
  }

  async save(sequence: DocumentSequenceRecord) {
    const index = this.sequences.findIndex((item) => item.id === sequence.id)
    if (index >= 0) {
      this.sequences[index] = sequence
    } else {
      this.sequences.push(sequence)
    }
    return sequence
  }
}

type SequenceRow = typeof schema.documentSequences.$inferSelect

function mapRowToRecord(row: SequenceRow): DocumentSequenceRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    financialYearId: row.financialYearId,
    voucherType: row.voucherType,
    series: row.series,
    nextNumber: row.nextNumber,
    updatedAt: row.updatedAt,
  }
}

export class DrizzleDocumentSequenceRepository
  implements DocumentSequenceRepository
{
  constructor(private readonly database: AppDatabase) {}

  async findForUpdate(input: {
    companyId: string
    financialYearId: string
    voucherType: string
    series: string
  }) {
    const rows = await this.database
      .select()
      .from(schema.documentSequences)
      .where(
        and(
          eq(schema.documentSequences.companyId, input.companyId),
          eq(schema.documentSequences.financialYearId, input.financialYearId),
          eq(schema.documentSequences.voucherType, input.voucherType),
          eq(schema.documentSequences.series, input.series),
        ),
      )
      .limit(1)

    if (rows.length === 0) return null
    return mapRowToRecord(rows[0])
  }

  async save(sequence: DocumentSequenceRecord) {
    const [saved] = await this.database
      .insert(schema.documentSequences)
      .values({
        id: sequence.id,
        companyId: sequence.companyId,
        financialYearId: sequence.financialYearId,
        voucherType: sequence.voucherType,
        series: sequence.series,
        nextNumber: sequence.nextNumber,
        updatedAt: sequence.updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.documentSequences.id,
        set: {
          nextNumber: sequence.nextNumber,
          updatedAt: sequence.updatedAt,
        },
      })
      .returning()

    return mapRowToRecord(saved)
  }
}

export function createDocumentSequenceRepository(): DocumentSequenceRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryDocumentSequenceRepository()
  }

  return new DrizzleDocumentSequenceRepository(database)
}

export const documentSequenceRepository = createDocumentSequenceRepository()
