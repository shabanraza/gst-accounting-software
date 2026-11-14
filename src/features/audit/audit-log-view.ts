import { localCalendarDate } from '#/lib/calendar-date.ts'

export type AuditLogRow = {
  id: string
  action: string
  actorUserId: string
  actorName: string
  createdAt: Date
  metadata: Record<string, unknown>
}

export type AuditCategory =
  | 'documents'
  | 'masters'
  | 'team'
  | 'company'
  | 'imports'

export const auditCategoryLabels: Record<AuditCategory, string> = {
  documents: 'Documents',
  masters: 'Parties, items and godowns',
  team: 'Team',
  company: 'Company',
  imports: 'Imports',
}

const actionLabels: Record<string, string> = {
  'company.created': 'Company created',
  'company.profile_updated': 'Company profile edited',
  'sales_invoice.posted': 'Sales invoice saved',
  'sales_invoice.cancelled': 'Sales invoice cancelled',
  'purchase_bill.posted': 'Purchase bill saved',
  'scanned_bill.confirmed': 'Scanned bill confirmed',
  'receipt.posted': 'Receipt recorded',
  'payment.posted': 'Payment recorded',
  'receipt.cancelled': 'Receipt cancelled',
  'payment.cancelled': 'Payment cancelled',
  'credit_note.posted': 'Credit note (sales return)',
  'debit_note.posted': 'Debit note (purchase return)',
  'expense.posted': 'Expense recorded',
  'journal_voucher.posted': 'Journal voucher',
  'contra_voucher.posted': 'Contra voucher',
  'payment_voucher.posted': 'Payment voucher',
  'receipt_voucher.posted': 'Receipt voucher',
  'sales_voucher.posted': 'Sales voucher',
  'purchase_voucher.posted': 'Purchase voucher',
  'party.created': 'Party added',
  'party.updated': 'Party edited',
  'item.created': 'Item added',
  'item.updated': 'Item edited',
  'opening_stock.posted': 'Opening stock added',
  'godown.created': 'Godown added',
  'godown.updated': 'Godown edited',
  'team_member.invited': 'Team member invited',
  'team_member.role_changed': 'Team role changed',
  'team_member.removed': 'Team member removed',
  'party_import.committed': 'Parties imported',
  'item_import.committed': 'Items imported',
  'opening_stock_import.committed': 'Opening stock imported',
  'opening_balance_import.committed': 'Opening balances imported',
}

const fieldLabels: Record<string, string> = {
  name: 'Name',
  partyType: 'Party type',
  gstin: 'GSTIN',
  stateCode: 'State',
  creditLimit: 'Credit limit',
  paymentTermsDays: 'Payment terms (days)',
  priceListId: 'Price list',
  pan: 'PAN',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'City',
  pincode: 'PIN code',
  contactPhone: 'Phone',
  contactEmail: 'Email',
  alias: 'Alias',
  barcode: 'Barcode',
  itemGroup: 'Item group',
  hsnCode: 'HSN/SAC',
  gstRate: 'GST rate',
  baseUnit: 'Unit',
  alternateUnit: 'Alternate unit',
  conversionFactor: 'Conversion factor',
  mrp: 'MRP',
  reorderLevel: 'Reorder level',
  purchaseRate: 'Purchase rate',
  saleRate: 'Sale rate',
  tracksInventory: 'Tracks stock',
  bankName: 'Bank name',
  bankAccountNumber: 'Bank account number',
  bankIfsc: 'IFSC',
  authorizedSignatory: 'Authorised signatory',
  logoUrl: 'Logo',
  invoiceTerms: 'Invoice terms',
  role: 'Role',
}

export function auditActionLabel(action: string) {
  return actionLabels[action] ?? action
}

export function auditActionCategory(action: string): AuditCategory {
  const entity = action.split('.')[0]
  if (entity.endsWith('_import')) return 'imports'
  if (entity === 'team_member') return 'team'
  if (entity === 'company') return 'company'
  if (['party', 'item', 'godown', 'opening_stock'].includes(entity)) {
    return 'masters'
  }
  return 'documents'
}

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

/** The short name shown in the Document column. */
export function auditEventLabel(metadata: Record<string, unknown>) {
  return (
    metadataText(metadata, 'label') ||
    metadataText(metadata, 'documentNumber') ||
    metadataText(metadata, 'tradeName')
  )
}

export function auditEventAmount(metadata: Record<string, unknown>) {
  return metadataText(metadata, 'amount')
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export type AuditFieldChange = { field: string; from: string; to: string }

export function auditEventChanges(
  metadata: Record<string, unknown>,
): Array<AuditFieldChange> {
  const changes = metadata.changes
  if (!changes || typeof changes !== 'object') return []
  return Object.entries(changes as Record<string, unknown>).map(
    ([field, change]) => {
      const { from, to } = (change ?? {}) as { from?: unknown; to?: unknown }
      return {
        field: fieldLabels[field] ?? field,
        from: displayValue(from),
        to: displayValue(to),
      }
    },
  )
}

export type AuditLogFilter = {
  category: AuditCategory | 'all'
  actorUserId: string
  /** Inclusive local calendar dates (YYYY-MM-DD); empty means open-ended. */
  fromDate: string
  toDate: string
}

export function filterAuditEvents<T extends AuditLogRow>(
  rows: Array<T>,
  filter: AuditLogFilter,
): Array<T> {
  return rows.filter((row) => {
    if (
      filter.category !== 'all' &&
      auditActionCategory(row.action) !== filter.category
    ) {
      return false
    }
    if (filter.actorUserId !== 'all' && row.actorUserId !== filter.actorUserId) {
      return false
    }
    const day = localCalendarDate(new Date(row.createdAt))
    if (filter.fromDate && day < filter.fromDate) return false
    if (filter.toDate && day > filter.toDate) return false
    return true
  })
}

export function listAuditActors(rows: Array<AuditLogRow>) {
  const actors = new Map<string, string>()
  for (const row of rows) {
    if (!actors.has(row.actorUserId)) {
      actors.set(row.actorUserId, row.actorName || row.actorUserId)
    }
  }
  return [...actors].map(([id, name]) => ({ id, name }))
}

function csvCell(value: string) {
  // A leading = + - @ would run as a formula in Excel; prefix it as text.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

function csvTimestamp(date: Date) {
  const time = [date.getHours(), date.getMinutes()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
  return `${localCalendarDate(date)} ${time}`
}

export function buildAuditCsv(rows: Array<AuditLogRow>) {
  const header = ['When', 'Who', 'Action', 'Document', 'Amount', 'Changes']
  const lines = rows.map((row) =>
    [
      csvTimestamp(new Date(row.createdAt)),
      row.actorName,
      auditActionLabel(row.action),
      auditEventLabel(row.metadata),
      auditEventAmount(row.metadata),
      auditEventChanges(row.metadata)
        .map((change) => `${change.field}: ${change.from} → ${change.to}`)
        .join('; '),
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...lines].join('\r\n')
}
