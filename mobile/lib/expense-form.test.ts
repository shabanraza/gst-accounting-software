import { describe, expect, it } from 'vitest'

import {
  buildPostExpenseInput,
  createInitialExpenseForm,
  filterPaymentAccounts,
  validateExpenseForm,
} from './expense-form.ts'

describe('expense-form', () => {
  it('filters cash and bank accounts', () => {
    expect(
      filterPaymentAccounts([
        { id: '1', name: 'Cash', systemKey: 'cash' },
        { id: '2', name: 'Sales', systemKey: 'sales' },
        { id: '3', name: 'Bank', systemKey: 'bank' },
      ]),
    ).toHaveLength(2)
  })

  it('validates required fields', () => {
    const form = createInitialExpenseForm()
    expect(validateExpenseForm(form, undefined)).toContain('ledger')

    expect(validateExpenseForm(form, 'expense-id')).toBe('Narration is required.')

    form.narration = 'Office rent'
    expect(validateExpenseForm(form, 'expense-id')).toBe(
      'Enter a positive amount.',
    )

    form.amount = '500'
    expect(validateExpenseForm(form, 'expense-id')).toBe(
      'Select a payment account.',
    )

    form.paymentAccountId = 'cash-id'
    expect(validateExpenseForm(form, 'expense-id')).toBeNull()
  })

  it('builds post payload', () => {
    const form = createInitialExpenseForm()
    form.narration = 'Office rent'
    form.amount = '500'
    form.paymentAccountId = 'cash-id'

    expect(
      buildPostExpenseInput(form, 'company-1', 'expense-id'),
    ).toMatchObject({
      companyId: 'company-1',
      amount: '500.00',
      expenseAccountId: 'expense-id',
    })
  })
})
