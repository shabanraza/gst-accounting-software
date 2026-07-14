import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'

export type Gstr2bItcStatus = 'pending' | 'accepted' | 'rejected'

export type Gstr2bItcDecisionRecord = {
  companyId: string
  periodStart: string
  periodEnd: string
  rowKey: string
  status: Gstr2bItcStatus
  updatedAt: Date
}

export type GstReconciliationRepository = {
  listGstr2bItcDecisions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<Array<Gstr2bItcDecisionRecord>>
  setGstr2bItcDecision(
    decision: Gstr2bItcDecisionRecord,
  ): Promise<Gstr2bItcDecisionRecord>
}

class InMemoryGstReconciliationRepository implements GstReconciliationRepository {
  private decisions: Array<Gstr2bItcDecisionRecord> = []

  async listGstr2bItcDecisions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    return this.decisions.filter(
      (decision) =>
        decision.companyId === companyId &&
        decision.periodStart === periodStart &&
        decision.periodEnd === periodEnd,
    )
  }

  async setGstr2bItcDecision(decision: Gstr2bItcDecisionRecord) {
    this.decisions = this.decisions.filter(
      (existing) =>
        !(
          existing.companyId === decision.companyId &&
          existing.periodStart === decision.periodStart &&
          existing.periodEnd === decision.periodEnd &&
          existing.rowKey === decision.rowKey
        ),
    )
    this.decisions.push(decision)
    return decision
  }
}

type Gstr2bItcDecisionRow = typeof schema.gstr2bItcDecisions.$inferSelect

function mapRowToDecision(row: Gstr2bItcDecisionRow): Gstr2bItcDecisionRecord {
  return {
    companyId: row.companyId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    rowKey: row.rowKey,
    status: row.status as Gstr2bItcStatus,
    updatedAt: row.updatedAt,
  }
}

class DrizzleGstReconciliationRepository implements GstReconciliationRepository {
  constructor(private readonly database: AppDatabase) {}

  async listGstr2bItcDecisions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const rows = await this.database
      .select()
      .from(schema.gstr2bItcDecisions)
      .where(
        and(
          eq(schema.gstr2bItcDecisions.companyId, companyId),
          eq(schema.gstr2bItcDecisions.periodStart, periodStart),
          eq(schema.gstr2bItcDecisions.periodEnd, periodEnd),
        ),
      )

    return rows.map(mapRowToDecision)
  }

  async setGstr2bItcDecision(decision: Gstr2bItcDecisionRecord) {
    const [saved] = await this.database
      .insert(schema.gstr2bItcDecisions)
      .values({
        companyId: decision.companyId,
        periodStart: decision.periodStart,
        periodEnd: decision.periodEnd,
        rowKey: decision.rowKey,
        status: decision.status,
        updatedAt: decision.updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          schema.gstr2bItcDecisions.companyId,
          schema.gstr2bItcDecisions.periodStart,
          schema.gstr2bItcDecisions.periodEnd,
          schema.gstr2bItcDecisions.rowKey,
        ],
        set: {
          status: decision.status,
          updatedAt: decision.updatedAt,
        },
      })
      .returning()

    return mapRowToDecision(saved)
  }
}

let inMemoryGstReconciliationRepository: InMemoryGstReconciliationRepository | null =
  null

export function createGstReconciliationRepository(): GstReconciliationRepository {
  const database = getDb()
  if (!database) {
    if (!inMemoryGstReconciliationRepository) {
      inMemoryGstReconciliationRepository =
        new InMemoryGstReconciliationRepository()
    }
    return inMemoryGstReconciliationRepository
  }

  return new DrizzleGstReconciliationRepository(database)
}

export const gstReconciliationRepository = createGstReconciliationRepository()
