import { describe, expect, test } from 'vitest'

import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postExpense } from '#/features/expenses/expense-service.ts'
import type {
  ExpenseRecord,
  ExpenseRepository,
} from '#/features/expenses/expense-service.ts'

class InMemoryExpenseRepository implements ExpenseRepository {
  private expenses: Array<ExpenseRecord> = []

  async create(expense: ExpenseRecord) {
    this.expenses.push(expense)
    return expense
  }

  async listByCompanyId(companyId: string) {
    return this.expenses.filter((expense) => expense.companyId === companyId)
  }
}

describe('postExpense', () => {
  test('posts expense to ledger and stores expense record', async () => {
    const expenses = new InMemoryExpenseRepository()
    const posting = new InMemoryLedgerPostingRepository()
    const companyId = crypto.randomUUID()
    const expenseAccountId = crypto.randomUUID()
    const cashAccountId = crypto.randomUUID()

    const expense = await postExpense(expenses, posting, {
      companyId,
      expenseDate: '2026-07-12',
      narration: 'Office rent',
      amount: '15000.00',
      expenseAccountId,
      paymentAccountId: cashAccountId,
    })

    expect(expense.amount).toBe('15000.00')
    expect(expense.ledgerEntryId).toBeTruthy()
    expect(await expenses.listByCompanyId(companyId)).toHaveLength(1)
  })
})
