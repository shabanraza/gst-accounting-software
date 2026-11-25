import Decimal from 'decimal.js'

import { LedgerAccountNotFoundError } from '#/features/accounting/ledger-account-guards.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type {
  LedgerAccountRecord,
  LedgerAccountRepository,
  LedgerAccountType,
} from '#/features/accounting/chart-of-accounts.ts'
import type {
  LedgerEntryRecord,
  LedgerPostingRepository,
  VoucherType,
} from '#/features/accounting/posting-engine.ts'

export type BalanceSide = 'Dr' | 'Cr'

export type LedgerBalance = {
  amount: string
  side: BalanceSide
}

export type AccountLedgerRow = {
  entryId: string
  entryDate: string
  voucherType: VoucherType
  narration: string
  counterAccounts: Array<{ id: string; name: string }>
  debit: string
  credit: string
  balance: LedgerBalance
}

export type AccountLedger = {
  account: Pick<LedgerAccountRecord, 'id' | 'code' | 'name' | 'accountType'>
  from: string
  to: string
  naturalSide: BalanceSide
  openingBalance: LedgerBalance
  rows: Array<AccountLedgerRow>
  totalDebit: string
  totalCredit: string
  closingBalance: LedgerBalance
}

export type AccountLedgerInput = {
  companyId: string
  ledgerAccountId: string
  from: string
  to: string
}

export class InvalidLedgerPeriodError extends DomainError {
  constructor(from: string, to: string) {
    super(`Start date ${from} is after end date ${to}`)
    this.name = 'InvalidLedgerPeriodError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

const debitNatureTypes = new Set<LedgerAccountType>(['asset', 'expense'])

function naturalSideFor(accountType: LedgerAccountType): BalanceSide {
  return debitNatureTypes.has(accountType) ? 'Dr' : 'Cr'
}

/** `net` is debit minus credit; a zero balance sits on the natural side. */
function toBalance(net: Decimal, naturalSide: BalanceSide): LedgerBalance {
  const side = net.isZero() ? naturalSide : net.isPositive() ? 'Dr' : 'Cr'
  return { amount: net.abs().toFixed(2), side }
}

function compareEntries(left: LedgerEntryRecord, right: LedgerEntryRecord) {
  return (
    left.entryDate.localeCompare(right.entryDate) ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  )
}

async function listAccountEntries(
  postings: LedgerPostingRepository,
  input: AccountLedgerInput,
) {
  if (postings.listEntriesByAccount) {
    return postings.listEntriesByAccount(
      input.companyId,
      input.ledgerAccountId,
      { endDate: input.to },
    )
  }

  const entries = await postings.listByCompanyId(input.companyId)
  return entries.filter(
    (entry) =>
      entry.entryDate <= input.to &&
      entry.lines.some(
        (line) => line.ledgerAccountId === input.ledgerAccountId,
      ),
  )
}

/**
 * Statement of one ledger account ("Ledger Vouchers"): the balance brought
 * forward from postings before `from`, every posting from `from` to `to`
 * with a running balance, and the closing balance.
 */
export async function buildAccountLedger(
  deps: {
    ledgers: LedgerAccountRepository
    postings: LedgerPostingRepository
  },
  input: AccountLedgerInput,
): Promise<AccountLedger> {
  if (input.from > input.to) {
    throw new InvalidLedgerPeriodError(input.from, input.to)
  }

  const [accounts, entries] = await Promise.all([
    deps.ledgers.listByCompanyId(input.companyId),
    listAccountEntries(deps.postings, input),
  ])

  const account = accounts.find(
    (candidate) =>
      candidate.id === input.ledgerAccountId &&
      candidate.companyId === input.companyId,
  )
  if (!account) {
    throw new LedgerAccountNotFoundError(input.ledgerAccountId)
  }

  const naturalSide = naturalSideFor(account.accountType)
  const accountNameById = new Map(
    accounts.map((candidate) => [candidate.id, candidate.name]),
  )

  let opening = new Decimal(0)
  let running = new Decimal(0)
  let totalDebit = new Decimal(0)
  let totalCredit = new Decimal(0)
  const rows: Array<AccountLedgerRow> = []

  const companyEntries = entries
    .filter((entry) => entry.companyId === input.companyId)
    .sort(compareEntries)

  for (const entry of companyEntries) {
    let debit = new Decimal(0)
    let credit = new Decimal(0)
    for (const line of entry.lines) {
      if (line.ledgerAccountId !== account.id) continue
      debit = debit.plus(line.debit)
      credit = credit.plus(line.credit)
    }
    const net = debit.minus(credit)

    if (entry.entryDate < input.from) {
      opening = opening.plus(net)
      running = opening
      continue
    }

    running = running.plus(net)
    totalDebit = totalDebit.plus(debit)
    totalCredit = totalCredit.plus(credit)

    rows.push({
      entryId: entry.id,
      entryDate: entry.entryDate,
      voucherType: entry.voucherType,
      narration: entry.narration,
      counterAccounts: counterAccountsFor(
        entry,
        account.id,
        net,
        accountNameById,
      ),
      debit: debit.toFixed(2),
      credit: credit.toFixed(2),
      balance: toBalance(running, naturalSide),
    })
  }

  return {
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
    },
    from: input.from,
    to: input.to,
    naturalSide,
    openingBalance: toBalance(opening, naturalSide),
    rows,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closingBalance: toBalance(
      opening.plus(totalDebit).minus(totalCredit),
      naturalSide,
    ),
  }
}

/**
 * The other accounts in the entry. When this account was debited, the
 * credited accounts are the counterpart (and vice versa); if none sit on the
 * opposite side, every other account is listed.
 */
function counterAccountsFor(
  entry: LedgerEntryRecord,
  accountId: string,
  net: Decimal,
  accountNameById: Map<string, string>,
) {
  const others = entry.lines.filter(
    (line) => line.ledgerAccountId !== accountId,
  )
  const opposite = others.filter((line) =>
    net.isPositive()
      ? !new Decimal(line.credit).isZero()
      : net.isNegative()
        ? !new Decimal(line.debit).isZero()
        : false,
  )
  const chosen = opposite.length > 0 ? opposite : others

  const seen = new Set<string>()
  const result: Array<{ id: string; name: string }> = []
  for (const line of chosen) {
    if (seen.has(line.ledgerAccountId)) continue
    seen.add(line.ledgerAccountId)
    result.push({
      id: line.ledgerAccountId,
      name: accountNameById.get(line.ledgerAccountId) ?? 'Unknown ledger',
    })
  }
  return result
}

export function formatLedgerBalance(balance: LedgerBalance) {
  return `${balance.amount} ${balance.side}`
}

export function formatVoucherType(voucherType: string) {
  return voucherType.charAt(0).toUpperCase() + voucherType.slice(1)
}

function csvCell(raw: string) {
  // A leading = + - @ would make spreadsheets run the cell as a formula.
  const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function accountLedgerToCsv(ledger: AccountLedger): string {
  const lines: Array<Array<string>> = [
    [
      'Date',
      'Voucher type',
      'Particulars',
      'Narration',
      'Debit',
      'Credit',
      'Balance',
    ],
    [
      ledger.from,
      '',
      'Opening balance',
      '',
      '',
      '',
      formatLedgerBalance(ledger.openingBalance),
    ],
    ...ledger.rows.map((row) => [
      row.entryDate,
      formatVoucherType(row.voucherType),
      row.counterAccounts.map((counter) => counter.name).join('; '),
      row.narration,
      row.debit,
      row.credit,
      formatLedgerBalance(row.balance),
    ]),
    ['', '', 'Total', '', ledger.totalDebit, ledger.totalCredit, ''],
    [
      ledger.to,
      '',
      'Closing balance',
      '',
      '',
      '',
      formatLedgerBalance(ledger.closingBalance),
    ],
  ]

  return lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}
