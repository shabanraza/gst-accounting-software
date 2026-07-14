import { parseDelimitedRows } from '#/features/imports/csv-parser.ts'

export type ParsedBankStatementLine = {
  lineDate: string
  description: string
  reference: string
  debit: string
  credit: string
}

const DATE_KEYS = ['date', 'txn date', 'transaction date', 'value date']
const DESCRIPTION_KEYS = [
  'description',
  'narration',
  'particulars',
  'remarks',
  'details',
]
const REFERENCE_KEYS = ['reference', 'ref', 'cheque no', 'utr', 'transaction id']
const DEBIT_KEYS = ['debit', 'withdrawal', 'dr', 'paid out']
const CREDIT_KEYS = ['credit', 'deposit', 'cr', 'paid in']
const AMOUNT_KEYS = ['amount', 'transaction amount']

function normalizeHeader(header: string) {
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

function normalizeMoney(raw: string): string {
  const cleaned = raw.replace(/[₹,\s]/g, '').trim()
  if (!cleaned) return '0.00'
  const value = Number(cleaned)
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid amount: ${raw}`)
  }
  return Math.abs(value).toFixed(2)
}

function normalizeDate(raw: string): string {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  throw new Error(`Unsupported date format: ${raw}`)
}

export function parseBankStatementCsv(text: string): Array<ParsedBankStatementLine> {
  const rows = parseDelimitedRows(text)
  const parsed: Array<ParsedBankStatementLine> = []

  for (const row of rows) {
    const lineDate = pickField(row, DATE_KEYS)
    if (!lineDate) continue

    let debit = normalizeMoney(pickField(row, DEBIT_KEYS))
    let credit = normalizeMoney(pickField(row, CREDIT_KEYS))

    if (debit === '0.00' && credit === '0.00') {
      const amount = pickField(row, AMOUNT_KEYS)
      if (amount) {
        const normalized = normalizeMoney(amount)
        if (amount.includes('-')) {
          debit = normalized
        } else {
          credit = normalized
        }
      }
    }

    if (debit === '0.00' && credit === '0.00') {
      continue
    }

    parsed.push({
      lineDate: normalizeDate(lineDate),
      description: pickField(row, DESCRIPTION_KEYS),
      reference: pickField(row, REFERENCE_KEYS),
      debit,
      credit,
    })
  }

  if (parsed.length === 0) {
    throw new Error('No bank statement rows found in file')
  }

  return parsed
}
