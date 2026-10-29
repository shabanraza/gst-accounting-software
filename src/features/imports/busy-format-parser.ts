import { parseDelimitedRows } from '#/features/imports/csv-parser.ts'
import { resolveImportStateCode } from '#/features/imports/import-state-code.ts'

export type BusyImportKind = 'parties' | 'items'

const PARTY_NAME_KEYS = ['account name', 'party name', 'name', 'account']
const PARTY_TYPE_KEYS = ['account type', 'type', 'group', 'account group']
const GSTIN_KEYS = ['gst no.', 'gst no', 'gstin', 'gst number', 'gst no ']
const STATE_KEYS = ['state', 'state code', 'state name']
const ITEM_NAME_KEYS = ['item name', 'name', 'product name']
const HSN_KEYS = ['hsn/sac', 'hsn', 'hsn code', 'sac']
const RATE_KEYS = ['sale rate', 'rate', 'purchase rate', 'mrp']
const UNIT_KEYS = ['unit', 'main unit', 'base unit', 'uom']

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function pickField(
  row: Record<string, string>,
  aliases: Array<string>,
): string {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  )

  for (const alias of aliases) {
    const value = normalized.get(alias)
    if (value !== undefined && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

function mapPartyType(rawType: string): 'customer' | 'supplier' {
  const value = rawType.toLowerCase()
  if (
    value.includes('supplier') ||
    value.includes('creditor') ||
    value.includes('purchase')
  ) {
    return 'supplier'
  }
  if (
    value.includes('customer') ||
    value.includes('debtor') ||
    value.includes('sales')
  ) {
    return 'customer'
  }
  return 'customer'
}

export function mapBusyPartyRow(
  row: Record<string, string>,
  defaultStateCode = '27',
) {
  const name = pickField(row, PARTY_NAME_KEYS)
  const gstin = pickField(row, GSTIN_KEYS) || null
  const stateCode = resolveImportStateCode(
    pickField(row, STATE_KEYS),
    gstin ?? '',
    defaultStateCode,
  )

  return {
    name,
    partyType: mapPartyType(pickField(row, PARTY_TYPE_KEYS)),
    gstin,
    stateCode,
  }
}

export function mapBusyItemRow(row: Record<string, string>) {
  const name = pickField(row, ITEM_NAME_KEYS)
  const hsn = pickField(row, HSN_KEYS) || '9997'
  const rate = pickField(row, RATE_KEYS) || '0.00'
  const unit = pickField(row, UNIT_KEYS) || 'Nos'

  return {
    name,
    hsn,
    rate,
    unit,
  }
}

export function parseBusyExport(
  text: string,
  kind: BusyImportKind,
  defaultStateCode = '27',
): Array<Record<string, string | null>> {
  const rows = parseDelimitedRows(text)

  return rows
    .map((row) =>
      kind === 'parties'
        ? mapBusyPartyRow(row, defaultStateCode)
        : mapBusyItemRow(row),
    )
    .filter((row) => row.name.trim().length > 0)
}
