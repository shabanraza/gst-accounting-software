import Decimal from 'decimal.js'

export type VoucherType =
  'journal' | 'payment' | 'receipt' | 'contra' | 'sales' | 'purchase'

export type LedgerLineInput = {
  ledgerAccountId: string
  debit: string
  credit: string
}

export type LedgerLineRecord = LedgerLineInput & {
  id: string
  companyId: string
  entryId: string
}

export type PostLedgerEntryInput = {
  companyId: string
  entryDate: string
  narration: string
  voucherType: VoucherType
  lines: Array<LedgerLineInput>
}

export type LedgerEntryRecord = {
  id: string
  companyId: string
  entryDate: string
  narration: string
  voucherType: VoucherType
  totalDebit: string
  totalCredit: string
  createdAt: Date
  lines: Array<LedgerLineRecord>
}

export interface LedgerPostingRepository {
  createEntry: (entry: LedgerEntryRecord) => Promise<LedgerEntryRecord>
  listByCompanyId: (
    companyId: string,
    options?: {
      startDate?: string
      endDate?: string
    },
  ) => Promise<Array<LedgerEntryRecord>>
  /** SQL-friendly account totals for trial balance / financial reports. */
  sumByAccount?: (
    companyId: string,
    options?: {
      startDate?: string
      endDate?: string
    },
  ) => Promise<Map<string, { debit: string; credit: string }>>
}

export class UnbalancedLedgerEntryError extends Error {
  constructor(totalDebit: string, totalCredit: string) {
    super(
      `Ledger entry is unbalanced: debit ${totalDebit} != credit ${totalCredit}`,
    )
    this.name = 'UnbalancedLedgerEntryError'
  }
}

export class InvalidLedgerLineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLedgerLineError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string): Decimal {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw new InvalidLedgerLineError(`Invalid money amount: ${value}`)
  }

  return new Decimal(value)
}

function formatMoney(value: Decimal): string {
  return value.toFixed(2)
}

function assertValidLine(line: LedgerLineInput) {
  const debit = money(line.debit)
  const credit = money(line.credit)

  if (debit.isNegative() || credit.isNegative()) {
    throw new InvalidLedgerLineError(
      'Debit and credit amounts must be non-negative',
    )
  }

  if (debit.isZero() && credit.isZero()) {
    throw new InvalidLedgerLineError(
      'Each ledger line must have a debit or credit amount',
    )
  }

  if (!debit.isZero() && !credit.isZero()) {
    throw new InvalidLedgerLineError(
      'Each ledger line must have either debit or credit, not both',
    )
  }
}

export async function postLedgerEntry(
  repository: LedgerPostingRepository,
  input: PostLedgerEntryInput,
): Promise<LedgerEntryRecord> {
  if (!input.companyId.trim()) {
    throw new InvalidLedgerLineError(
      'company_id is required for every ledger entry',
    )
  }

  if (input.lines.length < 2) {
    throw new InvalidLedgerLineError(
      'A ledger entry requires at least two lines',
    )
  }

  for (const line of input.lines) {
    assertValidLine(line)
  }

  const totalDebit = input.lines.reduce(
    (sum, line) => sum.plus(money(line.debit)),
    new Decimal(0),
  )
  const totalCredit = input.lines.reduce(
    (sum, line) => sum.plus(money(line.credit)),
    new Decimal(0),
  )

  if (!totalDebit.equals(totalCredit)) {
    throw new UnbalancedLedgerEntryError(
      formatMoney(totalDebit),
      formatMoney(totalCredit),
    )
  }

  const entryId = crypto.randomUUID()
  const createdAt = new Date()

  const entry: LedgerEntryRecord = {
    id: entryId,
    companyId: input.companyId,
    entryDate: input.entryDate,
    narration: input.narration,
    voucherType: input.voucherType,
    totalDebit: formatMoney(totalDebit),
    totalCredit: formatMoney(totalCredit),
    createdAt,
    lines: input.lines.map((line) => ({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      entryId,
      ledgerAccountId: line.ledgerAccountId,
      debit: formatMoney(money(line.debit)),
      credit: formatMoney(money(line.credit)),
    })),
  }

  return repository.createEntry(entry)
}
