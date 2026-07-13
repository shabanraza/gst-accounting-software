import { parseDelimitedRows } from '#/features/imports/csv-parser.ts'

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

function stateCodeFromGstin(gstin: string): string | null {
  if (gstin.length < 2) return null
  const code = gstin.slice(0, 2)
  return /^\d{2}$/.test(code) ? code : null
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  maharashtra: '27',
  gujarat: '24',
  karnataka: '29',
  'tamil nadu': '33',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  'west bengal': '19',
  telangana: '36',
  'andhra pradesh': '37',
}

function resolveStateCode(rawState: string, gstin: string): string {
  const fromGstin = stateCodeFromGstin(gstin)
  if (fromGstin) return fromGstin

  const trimmed = rawState.trim()
  if (/^\d{2}$/.test(trimmed)) return trimmed

  const mapped = STATE_NAME_TO_CODE[trimmed.toLowerCase()]
  if (mapped) return mapped

  return '27'
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

export function mapBusyPartyRow(row: Record<string, string>) {
  const name = pickField(row, PARTY_NAME_KEYS)
  const gstin = pickField(row, GSTIN_KEYS) || null
  const stateCode = resolveStateCode(pickField(row, STATE_KEYS), gstin ?? '')

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
): Array<Record<string, string>> {
  const rows = parseDelimitedRows(text)
  const mapper = kind === 'parties' ? mapBusyPartyRow : mapBusyItemRow

  return rows
    .map((row) => mapper(row))
    .filter((row) => row.name.trim().length > 0)
}
