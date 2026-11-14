import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'
import type {
  CustomerReceiptInput,
  PaymentAllocationRecord,
  SupplierPaymentInput,
} from '#/features/payments/payment-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type {
  PaymentStatus,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

export type PaymentVoucherKind = 'receipt' | 'payment'
export type PaymentVoucherMode = 'cash' | 'bank' | 'upi' | 'cheque'
export type PaymentVoucherStatus = 'posted' | 'cancelled'
export type PaymentDocumentType = 'sales_invoice' | 'purchase_bill'

export type PaymentVoucherAllocationRecord = {
  id: string
  companyId: string
  voucherId: string
  documentType: PaymentDocumentType
  documentId: string
  documentNumber: string
  amount: string
  createdAt: Date
}

export type PaymentVoucherRecord = {
  id: string
  companyId: string
  voucherNumber: string
  kind: PaymentVoucherKind
  partyId: string
  voucherDate: string
  mode: PaymentVoucherMode
  cashBankAccountId: string
  /** The receivable/payable ledger the voucher was posted against. */
  partyAccountId: string
  reference: string
  amount: string
  unallocatedAmount: string
  narration: string
  status: PaymentVoucherStatus
  ledgerEntryId: string
  cancelLedgerEntryId: string | null
  createdAt: Date
  allocations: Array<PaymentVoucherAllocationRecord>
}

export type PaymentVoucherListOptions = {
  kind?: PaymentVoucherKind
  partyId?: string
  startDate?: string
  endDate?: string
}

export interface PaymentVoucherRepository {
  /** Inserts the voucher header and its allocations. */
  create: (voucher: PaymentVoucherRecord) => Promise<PaymentVoucherRecord>
  findById: (
    companyId: string,
    id: string,
  ) => Promise<PaymentVoucherRecord | null>
  /** Row-locking read for read-modify-write inside a transaction. */
  lockById?: (
    companyId: string,
    id: string,
  ) => Promise<PaymentVoucherRecord | null>
  /** Updates the header and inserts allocations not stored yet. */
  save: (voucher: PaymentVoucherRecord) => Promise<PaymentVoucherRecord>
  listByCompanyId: (
    companyId: string,
    options?: PaymentVoucherListOptions,
  ) => Promise<Array<PaymentVoucherRecord>>
}

export type PaymentVoucherDependencies = {
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  posting: LedgerPostingRepository
  parties: PartyRepository
  sequences: DocumentSequenceRepository
  paymentVouchers: PaymentVoucherRepository
  ledgers: LedgerAccountRepository
  financialYears: FinancialYearRepository
}

export type VoucherAllocationInput = {
  documentId: string
  amount: string
}

export type PostPaymentVoucherInput = {
  companyId: string
  kind: PaymentVoucherKind
  partyId: string
  voucherDate: string
  mode: PaymentVoucherMode
  cashBankAccountId: string
  reference?: string
  amount: string
  narration?: string
  allocations: Array<VoucherAllocationInput>
}

export class PaymentVoucherError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentVoucherError'
  }
}

const SERIES: Record<PaymentVoucherKind, string> = {
  receipt: 'RCT',
  payment: 'PAY',
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string, label: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new PaymentVoucherError(`${label} must be a valid amount`)
  }
  return new Decimal(value.trim())
}

const formatMoney = (value: Decimal) => value.toFixed(2)

function statusForOutstanding(
  outstanding: Decimal,
  total: Decimal,
): PaymentStatus {
  if (outstanding.lte(0)) return 'Paid'
  if (outstanding.lt(total)) return 'Part paid'
  return 'Pending'
}

async function loadParty(
  deps: PaymentVoucherDependencies,
  companyId: string,
  partyId: string,
) {
  const party = await deps.parties.findById(partyId)
  if (!party || party.companyId !== companyId) {
    throw new PaymentVoucherError('Party not found for company')
  }
  return party
}

/** The receivable (receipts) or payable (payments) ledger the party sits in. */
async function controlAccountId(
  deps: PaymentVoucherDependencies,
  companyId: string,
  kind: PaymentVoucherKind,
  party: PartyRecord,
) {
  const own =
    kind === 'receipt' ? party.receivableAccountId : party.payableAccountId
  if (own) return own
  const accounts = await deps.ledgers.listByCompanyId(companyId)
  const systemKey =
    kind === 'receipt' ? 'customer_receivable' : 'supplier_payable'
  const account = accounts.find((row) => row.systemKey === systemKey)
  if (!account) {
    throw new PaymentVoucherError(
      kind === 'receipt'
        ? 'Customer receivable ledger is missing'
        : 'Supplier payable ledger is missing',
    )
  }
  return account.id
}

async function assertCashBankAccount(
  deps: PaymentVoucherDependencies,
  companyId: string,
  accountId: string,
) {
  const accounts = await deps.ledgers.listByCompanyId(companyId)
  const account = accounts.find((row) => row.id === accountId)
  const isCashOrBank =
    account?.accountType === 'asset' &&
    (account.systemKey === null ||
      account.systemKey === 'cash' ||
      account.systemKey === 'bank')
  if (!isCashOrBank) {
    throw new PaymentVoucherError('Choose a cash or bank ledger')
  }
}

async function allocateVoucherNumber(
  deps: PaymentVoucherDependencies,
  input: { companyId: string; kind: PaymentVoucherKind; voucherDate: string },
) {
  const years = await deps.financialYears.listByCompanyId(input.companyId)
  const year =
    years.find(
      (row) =>
        row.startDate <= input.voucherDate && input.voucherDate <= row.endDate,
    ) ??
    years.find((row) => row.isActive) ??
    years.at(0)
  if (!year) {
    throw new PaymentVoucherError('Set up a financial year first')
  }
  return nextDocumentNumber(deps.sequences, {
    companyId: input.companyId,
    financialYearId: year.id,
    voucherType: input.kind,
    series: SERIES[input.kind],
    padLength: 4,
  })
}

/**
 * Validates and applies allocations to open invoices (receipts) or bills
 * (payments): each must belong to the party and fit its outstanding.
 * Returns allocation rows; the documents are saved with reduced outstanding.
 */
async function applyAllocations(
  deps: PaymentVoucherDependencies,
  voucher: Pick<PaymentVoucherRecord, 'id' | 'companyId' | 'kind' | 'partyId'>,
  allocations: Array<VoucherAllocationInput>,
) {
  const seen = new Set<string>()
  const rows: Array<PaymentVoucherAllocationRecord> = []
  const writes: Array<() => Promise<unknown>> = []

  for (const allocation of allocations) {
    if (seen.has(allocation.documentId)) {
      throw new PaymentVoucherError('Each bill can be adjusted only once')
    }
    seen.add(allocation.documentId)
    const amount = money(allocation.amount, 'Adjusted amount')
    if (amount.lte(0)) {
      throw new PaymentVoucherError('Adjusted amount must be greater than zero')
    }

    if (voucher.kind === 'receipt') {
      const invoice = deps.invoices.lockById
        ? await deps.invoices.lockById(allocation.documentId)
        : await deps.invoices.findById(allocation.documentId)
      if (
        !invoice ||
        invoice.companyId !== voucher.companyId ||
        invoice.customerId !== voucher.partyId
      ) {
        throw new PaymentVoucherError('Invoice not found for this party')
      }
      if (invoice.status === 'cancelled') {
        throw new PaymentVoucherError(
          `${invoice.invoiceNumber} is cancelled and cannot be adjusted`,
        )
      }
      const outstanding = new Decimal(invoice.outstandingAmount)
      if (amount.gt(outstanding)) {
        throw new PaymentVoucherError(
          `Amount exceeds the balance due on ${invoice.invoiceNumber}`,
        )
      }
      const next = outstanding.minus(amount)
      writes.push(() =>
        deps.invoices.save({
          ...invoice,
          outstandingAmount: formatMoney(next),
          paymentStatus: statusForOutstanding(
            next,
            new Decimal(invoice.totalAmount),
          ),
        }),
      )
      rows.push(
        allocationRow(
          voucher,
          'sales_invoice',
          invoice.id,
          invoice.invoiceNumber,
          amount,
        ),
      )
    } else {
      const bill = deps.bills.lockById
        ? await deps.bills.lockById(allocation.documentId)
        : await deps.bills.findById(allocation.documentId)
      if (
        !bill ||
        bill.companyId !== voucher.companyId ||
        bill.supplierId !== voucher.partyId
      ) {
        throw new PaymentVoucherError('Bill not found for this party')
      }
      const outstanding = new Decimal(bill.outstandingAmount)
      if (amount.gt(outstanding)) {
        throw new PaymentVoucherError(
          `Amount exceeds the balance due on ${bill.supplierBillNumber}`,
        )
      }
      const next = outstanding.minus(amount)
      writes.push(() =>
        deps.bills.save({
          ...bill,
          outstandingAmount: formatMoney(next),
          paymentStatus: statusForOutstanding(
            next,
            new Decimal(bill.totalAmount),
          ),
        }),
      )
      rows.push(
        allocationRow(
          voucher,
          'purchase_bill',
          bill.id,
          bill.supplierBillNumber,
          amount,
        ),
      )
    }
  }

  return { rows, commit: () => runSequentially(writes) }
}

function allocationRow(
  voucher: Pick<PaymentVoucherRecord, 'id' | 'companyId'>,
  documentType: PaymentDocumentType,
  documentId: string,
  documentNumber: string,
  amount: Decimal,
): PaymentVoucherAllocationRecord {
  return {
    id: crypto.randomUUID(),
    companyId: voucher.companyId,
    voucherId: voucher.id,
    documentType,
    documentId,
    documentNumber,
    amount: formatMoney(amount),
    createdAt: new Date(),
  }
}

async function runSequentially(writes: Array<() => Promise<unknown>>) {
  for (const write of writes) {
    await write()
  }
}

function sumAllocations(rows: Array<{ amount: string }>) {
  return rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0))
}

/**
 * Posts a numbered receipt (from a customer) or payment (to a supplier).
 * One ledger entry moves the full amount between the cash/bank ledger and the
 * party's receivable/payable; any amount not adjusted against bills stays on
 * the voucher as an advance. Run inside a PostingTransaction.
 */
export async function postPaymentVoucher(
  deps: PaymentVoucherDependencies,
  input: PostPaymentVoucherInput,
): Promise<PaymentVoucherRecord> {
  const amount = money(input.amount, 'Amount')
  if (amount.lte(0)) {
    throw new PaymentVoucherError('Amount must be greater than zero')
  }

  const party = await loadParty(deps, input.companyId, input.partyId)
  await assertCashBankAccount(deps, input.companyId, input.cashBankAccountId)
  const controlId = await controlAccountId(
    deps,
    input.companyId,
    input.kind,
    party,
  )

  const id = crypto.randomUUID()
  const { rows, commit } = await applyAllocations(
    deps,
    { id, companyId: input.companyId, kind: input.kind, partyId: party.id },
    input.allocations,
  )
  const allocated = sumAllocations(rows)
  if (allocated.gt(amount)) {
    throw new PaymentVoucherError('Adjusted total is more than the amount')
  }

  const voucherNumber = await allocateVoucherNumber(deps, input)
  const value = formatMoney(amount)
  const cashLine = {
    ledgerAccountId: input.cashBankAccountId,
    debit: input.kind === 'receipt' ? value : '0.00',
    credit: input.kind === 'receipt' ? '0.00' : value,
  }
  const partyLine = {
    ledgerAccountId: controlId,
    debit: input.kind === 'receipt' ? '0.00' : value,
    credit: input.kind === 'receipt' ? value : '0.00',
  }
  const entry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.voucherDate,
    narration: `${input.kind === 'receipt' ? 'Receipt' : 'Payment'} ${voucherNumber} ${input.kind === 'receipt' ? 'from' : 'to'} ${party.name}`,
    voucherType: input.kind,
    lines:
      input.kind === 'receipt' ? [cashLine, partyLine] : [partyLine, cashLine],
  })

  await commit()

  return deps.paymentVouchers.create({
    id,
    companyId: input.companyId,
    voucherNumber,
    kind: input.kind,
    partyId: party.id,
    voucherDate: input.voucherDate,
    mode: input.mode,
    cashBankAccountId: input.cashBankAccountId,
    partyAccountId: controlId,
    reference: input.reference?.trim() ?? '',
    amount: value,
    unallocatedAmount: formatMoney(amount.minus(allocated)),
    narration: input.narration?.trim() ?? '',
    status: 'posted',
    ledgerEntryId: entry.id,
    cancelLedgerEntryId: null,
    createdAt: new Date(),
    allocations: rows,
  })
}

function toAllocationRecord(
  voucher: PaymentVoucherRecord,
): PaymentAllocationRecord {
  const [allocation] = voucher.allocations
  return {
    id: allocation.id,
    companyId: voucher.companyId,
    documentType: allocation.documentType,
    documentId: allocation.documentId,
    allocatedAmount: allocation.amount,
    paymentDate: voucher.voucherDate,
    ledgerEntryId: voucher.ledgerEntryId,
    createdAt: allocation.createdAt,
  }
}

/**
 * Single-invoice cash receipt used by older clients (the mobile app). It is
 * saved as a numbered receipt voucher like any other.
 */
export async function receiptVoucherForInvoice(
  deps: PaymentVoucherDependencies,
  input: CustomerReceiptInput,
): Promise<PaymentAllocationRecord> {
  const invoice = await deps.invoices.findById(input.invoiceId)
  if (!invoice || invoice.companyId !== input.companyId) {
    throw new PaymentVoucherError('Sales invoice not found for company')
  }
  const voucher = await postPaymentVoucher(deps, {
    companyId: input.companyId,
    kind: 'receipt',
    partyId: invoice.customerId,
    voucherDate: input.receiptDate,
    mode: 'cash',
    cashBankAccountId: input.cashAccountId,
    amount: input.amount,
    allocations: [{ documentId: invoice.id, amount: input.amount }],
  })
  return toAllocationRecord(voucher)
}

/** Single-bill cash payment used by older clients (the mobile app). */
export async function paymentVoucherForBill(
  deps: PaymentVoucherDependencies,
  input: SupplierPaymentInput,
): Promise<PaymentAllocationRecord> {
  const bill = await deps.bills.findById(input.purchaseBillId)
  if (!bill || bill.companyId !== input.companyId) {
    throw new PaymentVoucherError('Purchase bill not found for company')
  }
  const voucher = await postPaymentVoucher(deps, {
    companyId: input.companyId,
    kind: 'payment',
    partyId: bill.supplierId,
    voucherDate: input.paymentDate,
    mode: 'cash',
    cashBankAccountId: input.cashAccountId,
    amount: input.amount,
    allocations: [{ documentId: bill.id, amount: input.amount }],
  })
  return toAllocationRecord(voucher)
}

async function loadVoucherForUpdate(
  deps: PaymentVoucherDependencies,
  companyId: string,
  voucherId: string,
) {
  const voucher = deps.paymentVouchers.lockById
    ? await deps.paymentVouchers.lockById(companyId, voucherId)
    : await deps.paymentVouchers.findById(companyId, voucherId)
  if (!voucher || voucher.companyId !== companyId) {
    throw new PaymentVoucherError('Voucher not found for company')
  }
  if (voucher.status === 'cancelled') {
    throw new PaymentVoucherError(`${voucher.voucherNumber} is cancelled`)
  }
  return voucher
}

/**
 * Adjusts a voucher's advance against bills raised later. The money already
 * sits in the party's receivable/payable, so no new ledger entry is needed.
 */
export async function applyVoucherAdvance(
  deps: PaymentVoucherDependencies,
  input: {
    companyId: string
    voucherId: string
    allocations: Array<VoucherAllocationInput>
  },
): Promise<PaymentVoucherRecord> {
  const voucher = await loadVoucherForUpdate(
    deps,
    input.companyId,
    input.voucherId,
  )
  if (input.allocations.length === 0) {
    throw new PaymentVoucherError('Choose at least one bill to adjust')
  }
  const already = new Set(voucher.allocations.map((row) => row.documentId))
  if (input.allocations.some((row) => already.has(row.documentId))) {
    throw new PaymentVoucherError(
      'That bill is already adjusted on this voucher',
    )
  }
  const { rows, commit } = await applyAllocations(
    deps,
    voucher,
    input.allocations,
  )
  const remaining = new Decimal(voucher.unallocatedAmount)
  const applied = sumAllocations(rows)
  if (applied.gt(remaining)) {
    throw new PaymentVoucherError(
      'Adjusted total is more than the advance left',
    )
  }
  await commit()
  return deps.paymentVouchers.save({
    ...voucher,
    unallocatedAmount: formatMoney(remaining.minus(applied)),
    allocations: [...voucher.allocations, ...rows],
  })
}

/**
 * Cancels a voucher: posts the reverse ledger entry and gives each adjusted
 * invoice or bill its balance back.
 */
export async function cancelPaymentVoucher(
  deps: PaymentVoucherDependencies,
  input: { companyId: string; voucherId: string; cancelDate?: string },
): Promise<PaymentVoucherRecord> {
  const voucher = await loadVoucherForUpdate(
    deps,
    input.companyId,
    input.voucherId,
  )
  for (const allocation of voucher.allocations) {
    const amount = new Decimal(allocation.amount)
    if (allocation.documentType === 'sales_invoice') {
      const invoice = deps.invoices.lockById
        ? await deps.invoices.lockById(allocation.documentId)
        : await deps.invoices.findById(allocation.documentId)
      if (!invoice || invoice.companyId !== voucher.companyId) continue
      const next = Decimal.min(
        new Decimal(invoice.outstandingAmount).plus(amount),
        new Decimal(invoice.totalAmount),
      )
      await deps.invoices.save({
        ...invoice,
        outstandingAmount: formatMoney(next),
        paymentStatus: statusForOutstanding(
          next,
          new Decimal(invoice.totalAmount),
        ),
      })
    } else {
      const bill = deps.bills.lockById
        ? await deps.bills.lockById(allocation.documentId)
        : await deps.bills.findById(allocation.documentId)
      if (!bill || bill.companyId !== voucher.companyId) continue
      const next = Decimal.min(
        new Decimal(bill.outstandingAmount).plus(amount),
        new Decimal(bill.totalAmount),
      )
      await deps.bills.save({
        ...bill,
        outstandingAmount: formatMoney(next),
        paymentStatus: statusForOutstanding(
          next,
          new Decimal(bill.totalAmount),
        ),
      })
    }
  }

  const value = voucher.amount
  const reverse = await postLedgerEntry(deps.posting, {
    companyId: voucher.companyId,
    entryDate: input.cancelDate ?? voucher.voucherDate,
    narration: `Cancelled ${voucher.voucherNumber}`,
    voucherType: voucher.kind,
    lines: [
      {
        ledgerAccountId: voucher.partyAccountId,
        debit: voucher.kind === 'receipt' ? value : '0.00',
        credit: voucher.kind === 'receipt' ? '0.00' : value,
      },
      {
        ledgerAccountId: voucher.cashBankAccountId,
        debit: voucher.kind === 'receipt' ? '0.00' : value,
        credit: voucher.kind === 'receipt' ? value : '0.00',
      },
    ],
  })

  return deps.paymentVouchers.save({
    ...voucher,
    status: 'cancelled',
    cancelLedgerEntryId: reverse.id,
  })
}
