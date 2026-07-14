export type AuditEventRecord = {
  id: string
  companyId: string
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface AuditLogRepository {
  create: (event: AuditEventRecord) => Promise<AuditEventRecord>
  listByCompanyId: (companyId: string) => Promise<Array<AuditEventRecord>>
}

export async function recordAuditEvent(
  repository: AuditLogRepository,
  input: Omit<AuditEventRecord, 'id' | 'createdAt'>,
): Promise<AuditEventRecord> {
  return repository.create({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}
