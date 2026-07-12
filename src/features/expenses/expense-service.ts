import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

export type PostExpenseInput = {
  companyId: string
  expenseDate: string
  narration: string
  amount: string
  expenseAccountId: string
  paymentAccountId: string
}

export type ExpenseRecord = {
  id: string
  companyId: string
  expenseDate: string
  narration: string
  amount: string
  expenseAccountId: string
  paymentAccountId: string
  ledgerEntryId: string
  createdAt: Date
}

export interface ExpenseRepository {
  create: (expense: ExpenseRecord) => Promise<ExpenseRecord>
  listByCompanyId: (companyId: string) => Promise<Array<ExpenseRecord>>
}

export class InvalidExpenseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExpenseError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function postExpense(
  expenses: ExpenseRepository,
  posting: LedgerPostingRepository,
  input: PostExpenseInput,
): Promise<ExpenseRecord> {
  const amount = new Decimal(input.amount)
  if (!amount.isFinite() || amount.lte(0)) {
    throw new InvalidExpenseError('Expense amount must be greater than zero')
  }

  const money = amount.toFixed(2)
  const expenseId = crypto.randomUUID()

  const entry = await postLedgerEntry(posting, {
    companyId: input.companyId,
    entryDate: input.expenseDate,
    narration: input.narration || 'Expense',
    voucherType: 'payment',
    lines: [
      {
        ledgerAccountId: input.expenseAccountId,
        debit: money,
        credit: '0.00',
      },
      {
        ledgerAccountId: input.paymentAccountId,
        debit: '0.00',
        credit: money,
      },
    ],
  })

  return expenses.create({
    id: expenseId,
    companyId: input.companyId,
    expenseDate: input.expenseDate,
    narration: input.narration.trim() || 'Expense',
    amount: money,
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
