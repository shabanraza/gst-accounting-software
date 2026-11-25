import Decimal from 'decimal.js'

import { PartyNotFoundError } from '#/features/parties/party-service.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type { LedgerBalance } from '#/features/accounting/account-ledger-service.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type {
  PaymentVoucherMode,
  PaymentVoucherRecord,
  PaymentVoucherRepository,
} from '#/features/payments/payment-voucher-service.ts'
import type { PartyOpeningBalanceRepository } from '#/features/parties/party-opening-balance-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type PartyStatementRowKind =
  | 'opening_balance'
  | 'sales_invoice'
  | 'purchase_bill'
  | 'credit_note'
  | 'debit_note'
  | 'receipt'
  | 'payment'
  /** Money settled outside a voucher: a cash sale, or a receipt or payment
   * recorded before vouchers existed. */
  | 'settlement'

export type PartyStatementRow = {
  id: string
  date: string
  kind: PartyStatementRowKind
  documentNumber: string
  particulars: string
  debit: string
  credit: string
  balance: LedgerBalance
}

export type PartyStatement = {
  party: { id: string; name: string }
  from: string
  to: string
  openingBalance: LedgerBalance
  rows: Array<PartyStatementRow>
  totalDebit: string
  totalCredit: string
  closingBalance: LedgerBalance
}

export type PartyStatementInput = {
  companyId: string
  partyId: string
  from: string
  to: string
}

export type PartyStatementDependencies = {
  parties: Pick<PartyRepository, 'findById'>
  invoices: Pick<SalesInvoiceRepository, 'listByCompanyId'>
  bills: Pick<PurchaseBillRepository, 'listByCompanyId'>
  notes: Pick<CreditDebitNoteRepository, 'listByCompanyId'>
  vouchers: Pick<PaymentVoucherRepository, 'listByCompanyId'>
  postings: Pick<LedgerPostingRepository, 'listByCompanyId'>
  openingBalances: Pick<PartyOpeningBalanceRepository, 'findByPartyId'>
}

export class InvalidStatementPeriodError extends DomainError {
  constructor(from: string, to: string) {
    super(`Start date ${from} is after end date ${to}`)
    this.name = 'InvalidStatementPeriodError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

const ZERO = new Decimal(0)

const modeLabels: Record<PaymentVoucherMode, string> = {
  cash: 'Cash',
  bank: 'Bank',
  upi: 'UPI',
  cheque: 'Cheque',
}

const kindLabels: Record<PartyStatementRowKind, string> = {
  opening_balance: 'Opening balance',
  sales_invoice: 'Sales invoice',
  purchase_bill: 'Purchase bill',
  credit_note: 'Credit note',
  debit_note: 'Debit note',
  receipt: 'Receipt',
  payment: 'Payment',
  settlement: 'Settlement',
}

export function formatStatementKind(kind: PartyStatementRowKind) {
  return kindLabels[kind]
}

type DraftRow = Omit<PartyStatementRow, 'balance' | 'debit' | 'credit'> & {
  debit: Decimal
  credit: Decimal
  /** Keeps a document ahead of the money settled against it on the same day. */
  order: number
}

/** A document whose paid amount the statement must account for. */
type SettledDocument = {
  id: string
  number: string
  date: string
  total: Decimal
  outstanding: Decimal
  isCashSale: boolean
  side: 'invoice' | 'bill'
}

function voucherParticulars(voucher: PaymentVoucherRecord) {
  const parts = [
    voucher.kind === 'receipt' ? 'Receipt' : 'Payment',
    modeLabels[voucher.mode],
  ]
  const numbers = voucher.allocations.map(
    (allocation) => allocation.documentNumber,
  )
  if (numbers.length > 0) parts.push(`against ${numbers.join(', ')}`)
  if (new Decimal(voucher.unallocatedAmount).gt(0)) parts.push('advance')
  return parts.join(' · ')
}

const legacyNarration = {
  invoice: { voucherType: 'receipt', pattern: /^Receipt against (.+)$/ },
  bill: { voucherType: 'payment', pattern: /^Payment against (.+)$/ },
} as const

/**
 * The part of each document paid without a voucher (total less amount due
 * less voucher allocations). Receipts and payments recorded before vouchers
 * existed left only a ledger entry narrated "Receipt against INV-…", so those
 * entries give the dates; anything still unexplained is shown on the
 * document date, which keeps the closing balance equal to the amount due.
 */
async function settlementRows(
  deps: PartyStatementDependencies,
  companyId: string,
  documents: Array<SettledDocument>,
  voucherAllocated: Map<string, Decimal>,
): Promise<Array<DraftRow>> {
  const pending = documents
    .map((document) => ({
      document,
      unexplained: document.total
        .minus(document.outstanding)
        .minus(voucherAllocated.get(document.id) ?? ZERO),
    }))
    .filter((item) => item.unexplained.gt(0))
  if (pending.length === 0) return []

  const needsLedger = pending.some((item) => !item.document.isCashSale)
  const entries = needsLedger
    ? (await deps.postings.listByCompanyId(companyId)).sort(
        (left, right) =>
          left.entryDate.localeCompare(right.entryDate) ||
          left.createdAt.getTime() - right.createdAt.getTime(),
      )
    : []
  const usedEntryIds = new Set<string>()
  const rows: Array<DraftRow> = []

  for (const { document, unexplained } of pending) {
    let remaining = unexplained
    if (!document.isCashSale) {
      const { voucherType, pattern } = legacyNarration[document.side]
      for (const entry of entries) {
        if (remaining.lte(0)) break
        if (usedEntryIds.has(entry.id)) continue
        if (entry.voucherType !== voucherType) continue
        if (entry.entryDate < document.date) continue
        if (pattern.exec(entry.narration)?.[1] !== document.number) continue
        const amount = new Decimal(entry.totalDebit)
        if (amount.gt(remaining)) continue
        usedEntryIds.add(entry.id)
        remaining = remaining.minus(amount)
        rows.push(
          settlementRow(
            document,
            entry.id,
            entry.entryDate,
            amount,
            entry.narration,
          ),
        )
      }
    }
    if (remaining.gt(0)) {
      rows.push(
        settlementRow(
          document,
          `${document.id}-settled`,
          document.date,
          remaining,
          document.isCashSale
            ? 'Paid at sale'
            : `Settled against ${document.number}`,
        ),
      )
    }
  }
  return rows
}

function settlementRow(
  document: SettledDocument,
  id: string,
  date: string,
  amount: Decimal,
  particulars: string,
): DraftRow {
  return {
    id,
    date,
    kind: 'settlement',
    documentNumber: document.number,
    particulars,
    // Money received from a customer credits them; money paid to a supplier
    // debits them.
    debit: document.side === 'bill' ? amount : ZERO,
    credit: document.side === 'invoice' ? amount : ZERO,
    order: 1,
  }
}

function toBalance(net: Decimal, naturalSide: 'Dr' | 'Cr'): LedgerBalance {
  const side = net.isZero() ? naturalSide : net.isPositive() ? 'Dr' : 'Cr'
  return { amount: net.abs().toFixed(2), side }
}

/**
 * Statement of account for one customer or supplier: every invoice, bill,
 * return, receipt and payment, with the balance after each. A Dr balance
 * means the party owes the business.
 */
export async function buildPartyStatement(
  deps: PartyStatementDependencies,
  input: PartyStatementInput,
): Promise<PartyStatement> {
  if (input.from > input.to) {
    throw new InvalidStatementPeriodError(input.from, input.to)
  }
  const party = await deps.parties.findById(input.partyId)
  if (!party || party.companyId !== input.companyId) {
    throw new PartyNotFoundError(input.partyId)
  }

  const documentQuery = {
    partyId: party.id,
    endDate: input.to,
    includeLines: false,
  }
  const [invoices, bills, notes, vouchers, partyOpening] = await Promise.all([
    deps.invoices.listByCompanyId(input.companyId, documentQuery),
    deps.bills.listByCompanyId(input.companyId, documentQuery),
    deps.notes.listByCompanyId(input.companyId),
    // All vouchers, even after the period: their allocations explain how much
    // of each document's amount due has been paid.
    deps.vouchers.listByCompanyId(input.companyId, { partyId: party.id }),
    deps.openingBalances.findByPartyId(input.companyId, party.id),
  ])

  const drafts: Array<DraftRow> = []

  if (partyOpening) {
    const amount = new Decimal(partyOpening.amount)
    const receivable = partyOpening.side === 'receivable'
    drafts.push({
      id: partyOpening.id,
      date: partyOpening.asOfDate,
      kind: 'opening_balance',
      documentNumber: '',
      particulars: 'Opening balance',
      debit: receivable ? amount : ZERO,
      credit: receivable ? ZERO : amount,
      order: -1,
    })
  }
  const settledDocuments: Array<SettledDocument> = []

  for (const invoice of invoices) {
    if (invoice.customerId !== party.id || invoice.status === 'cancelled')
      continue
    drafts.push({
      id: invoice.id,
      date: invoice.invoiceDate,
      kind: 'sales_invoice',
      documentNumber: invoice.invoiceNumber,
      particulars: 'Sales invoice',
      debit: new Decimal(invoice.totalAmount),
      credit: ZERO,
      order: 0,
    })
    settledDocuments.push({
      id: invoice.id,
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      total: new Decimal(invoice.totalAmount),
      outstanding: new Decimal(invoice.outstandingAmount),
      isCashSale: invoice.paymentMode === 'cash',
      side: 'invoice',
    })
  }

  for (const bill of bills) {
    if (bill.supplierId !== party.id) continue
    drafts.push({
      id: bill.id,
      date: bill.billDate,
      kind: 'purchase_bill',
      documentNumber: bill.supplierBillNumber,
      particulars: 'Purchase bill',
      debit: ZERO,
      credit: new Decimal(bill.totalAmount),
      order: 0,
    })
    settledDocuments.push({
      id: bill.id,
      number: bill.supplierBillNumber,
      date: bill.billDate,
      total: new Decimal(bill.totalAmount),
      outstanding: new Decimal(bill.outstandingAmount),
      isCashSale: false,
      side: 'bill',
    })
  }

  for (const note of notes) {
    if (note.partyId !== party.id) continue
    const amount = new Decimal(note.totalAmount)
    const isCredit = note.noteType === 'credit'
    drafts.push({
      id: note.id,
      date: note.noteDate,
      kind: isCredit ? 'credit_note' : 'debit_note',
      documentNumber: note.noteNumber,
      particulars: isCredit ? 'Credit note' : 'Debit note',
      debit: isCredit ? ZERO : amount,
      credit: isCredit ? amount : ZERO,
      order: 0,
    })
  }

  const voucherAllocated = new Map<string, Decimal>()
  for (const voucher of vouchers) {
    if (voucher.partyId !== party.id || voucher.status !== 'posted') continue
    const amount = new Decimal(voucher.amount)
    const isReceipt = voucher.kind === 'receipt'
    drafts.push({
      id: voucher.id,
      date: voucher.voucherDate,
      kind: voucher.kind,
      documentNumber: voucher.voucherNumber,
      particulars: voucherParticulars(voucher),
      debit: isReceipt ? ZERO : amount,
      credit: isReceipt ? amount : ZERO,
      order: 1,
    })
    for (const allocation of voucher.allocations) {
      voucherAllocated.set(
        allocation.documentId,
        (voucherAllocated.get(allocation.documentId) ?? ZERO).plus(
          allocation.amount,
        ),
      )
    }
  }

  drafts.push(
    ...(await settlementRows(
      deps,
      input.companyId,
      settledDocuments,
      voucherAllocated,
    )),
  )

  // Stable sort keeps insertion order for rows on the same day and order.
  drafts.sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.order - right.order,
  )

  const naturalSide = party.partyType === 'supplier' ? 'Cr' : 'Dr'
  let opening = ZERO
  let running = ZERO
  let totalDebit = ZERO
  let totalCredit = ZERO
  const rows: Array<PartyStatementRow> = []

  for (const draft of drafts) {
    if (draft.date > input.to) continue
    const net = draft.debit.minus(draft.credit)
    // The party's opening balance on the first day of the period is the
    // statement's opening balance, not a row.
    const isOpening =
      draft.date < input.from ||
      (draft.kind === 'opening_balance' && draft.date === input.from)
    if (isOpening) {
      opening = opening.plus(net)
      running = opening
      continue
    }
    running = running.plus(net)
    totalDebit = totalDebit.plus(draft.debit)
    totalCredit = totalCredit.plus(draft.credit)
    rows.push({
      id: draft.id,
      date: draft.date,
      kind: draft.kind,
      documentNumber: draft.documentNumber,
      particulars: draft.particulars,
      debit: draft.debit.toFixed(2),
      credit: draft.credit.toFixed(2),
      balance: toBalance(running, naturalSide),
    })
  }

  return {
    party: { id: party.id, name: party.name },
    from: input.from,
    to: input.to,
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

function csvCell(raw: string) {
  // Leading formula characters are neutralised so spreadsheets show text.
  const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function balanceText(balance: LedgerBalance) {
  return `${balance.amount} ${balance.side}`
}

function amountText(amount: string) {
  return new Decimal(amount).isZero() ? '' : amount
}

export function partyStatementToCsv(statement: PartyStatement): string {
  const lines: Array<Array<string>> = [
    ['Date', 'Type', 'Number', 'Particulars', 'Debit', 'Credit', 'Balance'],
    [
      statement.from,
      '',
      '',
      'Opening balance',
      '',
      '',
      balanceText(statement.openingBalance),
    ],
    ...statement.rows.map((row) => [
      row.date,
      formatStatementKind(row.kind),
      row.documentNumber,
      row.particulars,
      amountText(row.debit),
      amountText(row.credit),
      balanceText(row.balance),
    ]),
    ['', '', '', 'Total', statement.totalDebit, statement.totalCredit, ''],
    [
      statement.to,
      '',
      '',
      'Closing balance',
      '',
      '',
      balanceText(statement.closingBalance),
    ],
  ]
  return lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}
