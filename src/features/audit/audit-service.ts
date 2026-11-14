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

export type DocumentAuditInput = {
  companyId: string
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  documentNumber: string
  amount: string
}

/** Records who posted or cancelled a document, with its number and amount. */
export function recordDocumentEvent(
  repository: AuditLogRepository,
  { documentNumber, amount, ...event }: DocumentAuditInput,
) {
  return recordAuditEvent(repository, {
    ...event,
    metadata: { documentNumber, amount },
  })
}

export type FieldChanges = Record<string, { from: unknown; to: unknown }>

const HIDDEN_VALUE = '(hidden)'

function normalizeFieldValue(value: unknown) {
  return value === undefined || value === '' ? null : value
}

/**
 * The fields whose value differs between `before` and `after`, as
 * `{ field: { from, to } }`. Missing, null and empty count as the same. Values
 * of `hidden` fields are masked so secrets and large blobs stay out of the log.
 */
export function diffFields<T extends object>(
  before: T,
  after: T,
  fields: ReadonlyArray<keyof T & string>,
  { hidden = [] }: { hidden?: ReadonlyArray<string> } = {},
): FieldChanges {
  const changes: FieldChanges = {}
  for (const field of fields) {
    const from = normalizeFieldValue(before[field])
    const to = normalizeFieldValue(after[field])
    if (JSON.stringify(from) === JSON.stringify(to)) continue
    const mask = (value: unknown) =>
      hidden.includes(field) ? (value === null ? '' : HIDDEN_VALUE) : value
    changes[field] = { from: mask(from), to: mask(to) }
  }
  return changes
}

export type MasterAuditInput = {
  companyId: string
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  /** Short human label shown in the log, e.g. the party or item name. */
  label: string
  details?: Record<string, unknown>
  /** For updates: only the changed fields. An empty object skips the event. */
  changes?: FieldChanges
}

/** Records a master, team or import change. Returns null for a no-op update. */
export async function recordMasterEvent(
  repository: AuditLogRepository,
  { label, details, changes, ...event }: MasterAuditInput,
): Promise<AuditEventRecord | null> {
  if (changes && Object.keys(changes).length === 0) {
    return null
  }
  return recordAuditEvent(repository, {
    ...event,
    metadata: { label, ...details, ...(changes ? { changes } : {}) },
  })
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
