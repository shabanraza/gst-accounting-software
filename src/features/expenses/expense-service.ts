import { DomainError } from '#/lib/domain-error.ts'
import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { isValidGstin } from '#/features/gst/gst-validation.ts'

import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

export type PostExpenseInput = {
  companyId: string
  expenseDate: string
  narration: string
  /** Amount before GST. Without a GST rate this is the amount paid. */
  amount: string
  expenseAccountId: string
  paymentAccountId: string
  gstRate?: string
  supplierName?: string
  supplierGstin?: string
  billNumber?: string
  /** Claim the GST as input tax credit; otherwise it is part of the expense. */
  claimItc?: boolean
  /** Input GST ledger; required when credit is claimed. */
  inputGstAccountId?: string
}

export type ExpenseRecord = {
  id: string
  companyId: string
  expenseDate: string
  narration: string
  /** Total paid, GST included. */
  amount: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  itcClaimed: boolean
  supplierName: string
  supplierGstin: string
  billNumber: string
  /** State code from the supplier GSTIN; blank when there is none. */
  placeOfSupply: string
  expenseAccountId: string
  paymentAccountId: string
  ledgerEntryId: string
  createdAt: Date
}

export interface ExpenseRepository {
  create: (expense: ExpenseRecord) => Promise<ExpenseRecord>
  listByCompanyId: (companyId: string) => Promise<Array<ExpenseRecord>>
}

export class InvalidExpenseError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExpenseError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function parseAmount(value: string) {
  try {
    return new Decimal(value)
  } catch {
    return new Decimal(NaN)
  }
}

export async function postExpense(
  expenses: ExpenseRepository,
  posting: LedgerPostingRepository,
  input: PostExpenseInput,
): Promise<ExpenseRecord> {
  const taxable = parseAmount(input.amount)
  if (!taxable.isFinite() || taxable.lte(0)) {
    throw new InvalidExpenseError('Expense amount must be greater than zero')
  }
  const rate = parseAmount(input.gstRate?.trim() || '0')
  if (!rate.isFinite() || rate.lt(0) || rate.gt(100)) {
    throw new InvalidExpenseError('GST rate must be between 0 and 100')
  }

  const gst = taxable.times(rate).div(100).toDecimalPlaces(2)
  const total = taxable.plus(gst)
  const supplierGstin = (input.supplierGstin ?? '').trim().toUpperCase()
  const billNumber = (input.billNumber ?? '').trim()
  const itcClaimed = Boolean(input.claimItc) && gst.gt(0)

  if (supplierGstin && !isValidGstin(supplierGstin)) {
    throw new InvalidExpenseError('Supplier GSTIN is not valid')
  }
  if (itcClaimed) {
    if (!supplierGstin) {
      throw new InvalidExpenseError(
        'Enter the supplier GSTIN to claim input tax credit',
      )
    }
    if (!billNumber) {
      throw new InvalidExpenseError(
        'Enter the bill number to claim input tax credit',
      )
    }
    if (!input.inputGstAccountId) {
      throw new InvalidExpenseError('Input GST ledger is missing')
    }
  }

  const money = (value: Decimal) => value.toFixed(2)
  const expenseDebit = itcClaimed ? taxable : total
  const lines = [
    {
      ledgerAccountId: input.expenseAccountId,
      debit: money(expenseDebit),
      credit: '0.00',
    },
    ...(itcClaimed
      ? [
          {
            ledgerAccountId: input.inputGstAccountId!,
            debit: money(gst),
            credit: '0.00',
          },
        ]
      : []),
    {
      ledgerAccountId: input.paymentAccountId,
      debit: '0.00',
      credit: money(total),
    },
  ]

  const narration = input.narration.trim() || 'Expense'
  const entry = await postLedgerEntry(posting, {
    companyId: input.companyId,
    entryDate: input.expenseDate,
    narration,
    voucherType: 'payment',
    lines,
  })

  return expenses.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    expenseDate: input.expenseDate,
    narration,
    amount: money(total),
    taxableAmount: money(taxable),
    gstRate: money(rate),
    gstAmount: money(gst),
    itcClaimed,
    supplierName: (input.supplierName ?? '').trim(),
    supplierGstin,
    billNumber,
    placeOfSupply: supplierGstin.slice(0, 2),
    expenseAccountId: input.expenseAccountId,
    paymentAccountId: input.paymentAccountId,
    ledgerEntryId: entry.id,
    createdAt: new Date(),
  })
}

export async function listExpensesByCompany(
  expenses: ExpenseRepository,
  companyId: string,
) {
  return expenses.listByCompanyId(companyId)
}
