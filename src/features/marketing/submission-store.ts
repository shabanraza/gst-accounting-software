import { and, count, eq, gte } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  SubmissionRecord,
  SubmissionRepository,
} from '#/features/marketing/submission-service.ts'

export class InMemorySubmissionRepository implements SubmissionRepository {
  private submissions: Array<SubmissionRecord> = []

  async create(record: SubmissionRecord) {
    const isRepeatWaitlist =
      record.kind === 'waitlist' &&
      this.submissions.some(
        (existing) =>
          existing.kind === 'waitlist' && existing.email === record.email,
      )
    if (isRepeatWaitlist) return false
    this.submissions.push(record)
    return true
  }

  async countByIpHashSince(ipHash: string, since: Date) {
    return this.submissions.filter(
      (submission) =>
        submission.ipHash === ipHash && submission.createdAt >= since,
    ).length
  }

  async list() {
    return [...this.submissions]
  }
}

export class DrizzleSubmissionRepository implements SubmissionRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(record: SubmissionRecord) {
    // The partial unique index on waitlist emails turns a repeat signup into
    // a no-op instead of an error.
    const rows = await this.database
      .insert(schema.marketingSubmissions)
      .values(record)
      .onConflictDoNothing()
      .returning({ id: schema.marketingSubmissions.id })

    return rows.length > 0
  }

  async countByIpHashSince(ipHash: string, since: Date) {
    const [row] = await this.database
      .select({ total: count() })
      .from(schema.marketingSubmissions)
      .where(
        and(
          eq(schema.marketingSubmissions.ipHash, ipHash),
          gte(schema.marketingSubmissions.createdAt, since),
        ),
      )

    return row.total
  }
}

export function createSubmissionRepository(): SubmissionRepository {
  const database = getDb()
  if (!database) {
    return new InMemorySubmissionRepository()
  }

  return new DrizzleSubmissionRepository(database)
}

export const submissionRepository = createSubmissionRepository()
