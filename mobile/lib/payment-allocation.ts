export function hasOutstandingBalance(outstandingAmount: string) {
  return Number(outstandingAmount) > 0
}

export function validatePaymentAmount(
  amount: string,
  outstandingAmount: string,
) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 'Enter a positive amount.'
  }

  if (parsed > Number(outstandingAmount)) {
    return 'Amount cannot exceed outstanding balance.'
  }

  return null
}
