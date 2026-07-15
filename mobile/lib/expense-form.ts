export type ExpenseFormDraft = {
  expenseDate: string
  narration: string
  amount: string
  paymentAccountId: string
}

export type LedgerAccountLike = {
  id: string
  name: string
  systemKey: string | null
}

export function createInitialExpenseForm(): ExpenseFormDraft {
  return {
    expenseDate: new Date().toISOString().slice(0, 10),
    narration: '',
    amount: '',
    paymentAccountId: '',
  }
}

export function filterPaymentAccounts(accounts: Array<LedgerAccountLike>) {
  return accounts.filter(
    (account) => account.systemKey === 'cash' || account.systemKey === 'bank',
  )
}

export function validateExpenseForm(
  form: ExpenseFormDraft,
  expenseAccountId: string | undefined,
) {
  if (!expenseAccountId) {
    return 'Expense ledger is not configured for this company.'
  }

  if (!form.narration.trim()) {
    return 'Narration is required.'
  }

  const amount = Number(form.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Enter a positive amount.'
  }

  if (!form.expenseDate.trim()) {
    return 'Expense date is required.'
  }

  if (!form.paymentAccountId.trim()) {
    return 'Select a payment account.'
  }

  return null
}

export function buildPostExpenseInput(
  form: ExpenseFormDraft,
  companyId: string,
  expenseAccountId: string,
) {
  const amount = Number(form.amount)
  return {
    companyId,
    expenseDate: form.expenseDate,
    narration: form.narration.trim(),
    amount: amount.toFixed(2),
    expenseAccountId,
    paymentAccountId: form.paymentAccountId,
  }
}
