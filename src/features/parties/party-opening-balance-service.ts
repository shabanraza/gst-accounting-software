import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'

/** `receivable`: the party owes the business; `payable`: the business owes them. */
export type OpeningBalanceSide = 'receivable' | 'payable'

/**
 * A customer's or supplier's balance carried in from before the business
 * started using HisaabKro. Receipts and payments can be adjusted against it
 * like an invoice or bill, which lowers `outstandingAmount`.
 */
export type PartyOpeningBalanceRecord = {
  id: string
  companyId: string
  partyId: string
  side: OpeningBalanceSide
  asOfDate: string
  amount: string
  outstandingAmount: string
  /** The receivable/payable ledger the balance was posted to. */
  partyAccountId: string
  ledgerEntryId: string
  createdAt: Date
  updatedAt: Date
}

export interface PartyOpeningBalanceRepository {
  findById: (
    companyId: string,
    id: string,
  ) => Promise<PartyOpeningBalanceRecord | null>
  /** Row-locking read for read-modify-write inside a transaction. */
  lockById?: (
    companyId: string,
    id: string,
  ) => Promise<PartyOpeningBalanceRecord | null>
  findByPartyId: (
    companyId: string,
    partyId: string,
  ) => Promise<PartyOpeningBalanceRecord | null>
  listByCompanyId: (
    companyId: string,
  ) => Promise<Array<PartyOpeningBalanceRecord>>
  /** Inserts or updates by id. */
  save: (
    record: PartyOpeningBalanceRecord,
  ) => Promise<PartyOpeningBalanceRecord>
  delete: (companyId: string, id: string) => Promise<void>
}

export type PartyOpeningBalanceDependencies = {
  parties: Pick<PartyRepository, 'findById'>
  ledgers: Pick<LedgerAccountRepository, 'listByCompanyId'>
  posting: LedgerPostingRepository
  financialYears: FinancialYearRepository
  openingBalances: PartyOpeningBalanceRepository
}

export type SetPartyOpeningBalanceInput = {
  companyId: string
  partyId: string
  side: OpeningBalanceSide
  /** Blank or zero removes the opening balance. */
  amount: string
}

export class PartyOpeningBalanceError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'PartyOpeningBalanceError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function parseAmount(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return new Decimal(0)
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new PartyOpeningBalanceError('Opening balance must be a valid amount')
  }
  return new Decimal(trimmed)
}

/** Opening balances sit on the first day of the company's earliest year. */
async function openingDate(
  deps: PartyOpeningBalanceDependencies,
  companyId: string,
) {
  const years = await deps.financialYears.listByCompanyId(companyId)
  const first = years
    .map((year) => year.startDate)
    .sort()
    .at(0)
  if (!first) {
    throw new PartyOpeningBalanceError('Set up a financial year first')
  }
  return first
}

async function resolveAccounts(
  deps: PartyOpeningBalanceDependencies,
  companyId: string,
  party: PartyRecord,
  side: OpeningBalanceSide,
) {
  const accounts = await deps.ledgers.listByCompanyId(companyId)
  const idFor = (systemKey: string) =>
    accounts.find((account) => account.systemKey === systemKey)?.id
  const partyAccountId =
    side === 'receivable'
      ? (party.receivableAccountId ?? idFor('customer_receivable'))
      : (party.payableAccountId ?? idFor('supplier_payable'))
  const openingAccountId = idFor('opening_balance')
  if (!partyAccountId || !openingAccountId) {
    throw new PartyOpeningBalanceError(
      'Receivable, payable and Opening Balance ledgers are required',
    )
  }
  return { partyAccountId, openingAccountId }
}

/** Dr the party for an amount to receive, Cr them for an amount to pay. */
function postBalance(
  deps: PartyOpeningBalanceDependencies,
  input: {
    companyId: string
    entryDate: string
    narration: string
    side: OpeningBalanceSide
    amount: string
    partyAccountId: string
    openingAccountId: string
  },
) {
  const partyDebit = input.side === 'receivable'
  return postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.entryDate,
    narration: input.narration,
    voucherType: 'journal',
    lines: [
      {
        ledgerAccountId: input.partyAccountId,
        debit: partyDebit ? input.amount : '0.00',
        credit: partyDebit ? '0.00' : input.amount,
      },
      {
        ledgerAccountId: input.openingAccountId,
        debit: partyDebit ? '0.00' : input.amount,
        credit: partyDebit ? input.amount : '0.00',
      },
    ],
  })
}

/**
 * Sets, changes or removes a party's opening balance. Each change reverses
 * the previous ledger entry and posts the new one, so the books always match
 * the stored balance. Run inside a PostingTransaction.
 */
export async function setPartyOpeningBalance(
  deps: PartyOpeningBalanceDependencies,
  input: SetPartyOpeningBalanceInput,
): Promise<PartyOpeningBalanceRecord | null> {
  const amount = parseAmount(input.amount)
  const party = await deps.parties.findById(input.partyId)
  if (!party || party.companyId !== input.companyId) {
    throw new PartyOpeningBalanceError('Party not found for company')
  }

  const existing = await deps.openingBalances.findByPartyId(
    input.companyId,
    party.id,
  )
  const formatted = amount.toFixed(2)

  if (existing) {
    const unchanged =
      existing.side === input.side && existing.amount === formatted
    if (unchanged) return existing
    if (new Decimal(existing.outstandingAmount).lt(existing.amount)) {
      throw new PartyOpeningBalanceError(
        'Receipts or payments are adjusted against this opening balance. Cancel them before changing it.',
      )
    }
  } else if (amount.isZero()) {
    return null
  }

  const { partyAccountId, openingAccountId } = await resolveAccounts(
    deps,
    input.companyId,
    party,
    input.side,
  )

  if (existing) {
    await postBalance(deps, {
      companyId: input.companyId,
      entryDate: existing.asOfDate,
      narration: `Reversed opening balance: ${party.name}`,
      // The reversal swaps sides on the account the balance was posted to.
      side: existing.side === 'receivable' ? 'payable' : 'receivable',
      amount: existing.amount,
      partyAccountId: existing.partyAccountId,
      openingAccountId,
    })
    if (amount.isZero()) {
      await deps.openingBalances.delete(input.companyId, existing.id)
      return null
    }
  }

  const asOfDate = await openingDate(deps, input.companyId)
  const entry = await postBalance(deps, {
    companyId: input.companyId,
    entryDate: asOfDate,
    narration: `Opening balance: ${party.name}`,
    side: input.side,
    amount: formatted,
    partyAccountId,
    openingAccountId,
  })

  const now = new Date()
  return deps.openingBalances.save({
    id: existing?.id ?? crypto.randomUUID(),
    companyId: input.companyId,
    partyId: party.id,
    side: input.side,
    asOfDate,
    amount: formatted,
    outstandingAmount: formatted,
    partyAccountId,
    ledgerEntryId: entry.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}
