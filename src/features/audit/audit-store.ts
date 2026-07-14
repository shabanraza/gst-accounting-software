import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  AuditEventRecord,
  AuditLogRepository,
} from '#/features/audit/audit-service.ts'

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private readonly events: Array<AuditEventRecord> = []

  async create(event: AuditEventRecord) {
    this.events.push(event)
    return event
  }

  async listByCompanyId(companyId: string) {
    return this.events.filter((event) => event.companyId === companyId)
  }

  list() {
    return this.events
  }
}

type AuditEventRow = typeof schema.auditEvents.$inferSelect

function mapRowToAuditEventRecord(row: AuditEventRow): AuditEventRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    actorUserId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.createdAt,
  }
}

export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(event: AuditEventRecord) {
    const [createdEvent] = await this.database
      .insert(schema.auditEvents)
      .values({
        id: event.id,
        companyId: event.companyId,
        actorUserId: event.actorUserId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: JSON.stringify(event.metadata),
        createdAt: event.createdAt,
      })
      .returning()

    return mapRowToAuditEventRecord(createdEvent)
  }

  async listByCompanyId(companyId: string) {
    const events = await this.database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.companyId, companyId))

    return events.map(mapRowToAuditEventRecord)
  }
}

export function createAuditLogRepository(): AuditLogRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryAuditLogRepository()
  }

  return new DrizzleAuditLogRepository(database)
}

export const auditLogRepository = createAuditLogRepository()
