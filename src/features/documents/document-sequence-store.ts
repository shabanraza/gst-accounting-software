import { sql } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  DocumentSequenceRepository,
  DocumentSequenceScope,
} from '#/features/documents/document-sequence-service.ts'

function scopeKey(scope: DocumentSequenceScope) {
  return [
    scope.companyId,
    scope.financialYearId,
    scope.voucherType,
    scope.series,
  ].join('|')
}

export class InMemoryDocumentSequenceRepository implements DocumentSequenceRepository {
  private nextNumbers = new Map<string, number>()

  async allocateNext(scope: DocumentSequenceScope) {
    const key = scopeKey(scope)
    const value = this.nextNumbers.get(key) ?? 1
    this.nextNumbers.set(key, value + 1)
    return value
  }
}

export class DrizzleDocumentSequenceRepository implements DocumentSequenceRepository {
  constructor(private readonly database: AppDatabase) {}

  /**
   * One upsert statement: Postgres row-locks the scope row, so concurrent
   * callers each get a distinct number (no SELECT-then-UPDATE race).
   */
  async allocateNext(scope: DocumentSequenceScope) {
    const now = new Date()
    const [row] = await this.database
      .insert(schema.documentSequences)
      .values({
        companyId: scope.companyId,
        financialYearId: scope.financialYearId,
        voucherType: scope.voucherType,
        series: scope.series,
        nextNumber: 2,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.documentSequences.companyId,
          schema.documentSequences.financialYearId,
          schema.documentSequences.voucherType,
          schema.documentSequences.series,
        ],
        set: {
          nextNumber: sql.raw('"document_sequences"."next_number" + 1'),
          updatedAt: now,
        },
      })
      .returning({ nextNumber: schema.documentSequences.nextNumber })

    return row.nextNumber - 1
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
