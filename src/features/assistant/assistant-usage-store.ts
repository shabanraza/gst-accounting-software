import { sql } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'

export interface AssistantUsageRepository {
  /** Counts one question and returns the company's total for that day. */
  increment: (companyId: string, usageDate: string) => Promise<number>
}

export class InMemoryAssistantUsageRepository implements AssistantUsageRepository {
  private readonly counts = new Map<string, number>()

  async increment(companyId: string, usageDate: string) {
    const key = `${companyId}:${usageDate}`
    const next = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, next)
    return next
  }
}

class DrizzleAssistantUsageRepository implements AssistantUsageRepository {
  constructor(private readonly database: AppDatabase) {}

  // One upsert statement, so concurrent questions cannot lose a count.
  async increment(companyId: string, usageDate: string) {
    const rows = await this.database
      .insert(schema.assistantUsage)
      .values({ companyId, usageDate, questionCount: 1 })
      .onConflictDoUpdate({
        target: [schema.assistantUsage.companyId, schema.assistantUsage.usageDate],
        set: {
          questionCount: sql`${schema.assistantUsage.questionCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ questionCount: schema.assistantUsage.questionCount })
    return rows[0]?.questionCount ?? 1
  }
}

export function createAssistantUsageRepository(): AssistantUsageRepository {
  const database = getDb()
  if (!database) return new InMemoryAssistantUsageRepository()
  return new DrizzleAssistantUsageRepository(database)
}

export const assistantUsageRepository = createAssistantUsageRepository()
