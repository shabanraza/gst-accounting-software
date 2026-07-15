function parseMoney(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null

  const [, whole = '0', fraction = ''] = match
  const fractionPadded = `${fraction}00`.slice(0, 2)
  return BigInt(whole) * 100n + BigInt(fractionPadded)
}

function isPositiveMoney(value: string) {
  const parsed = parseMoney(value)
  return parsed !== null && parsed > 0n
}

function compareMoney(left: string, right: string) {
  const leftAmount = parseMoney(left)
  const rightAmount = parseMoney(right)

  if (leftAmount === null || rightAmount === null) {
    return null
  }

  if (leftAmount === rightAmount) return 0
  return leftAmount > rightAmount ? 1 : -1
}

export function hasOutstandingBalance(outstandingAmount: string) {
  return isPositiveMoney(outstandingAmount)
}

export function validatePaymentAmount(
  amount: string,
  outstandingAmount: string,
) {
  if (!isPositiveMoney(amount)) {
    return 'Enter a positive amount.'
  }

  const comparison = compareMoney(amount, outstandingAmount)
  if (comparison === null) {
    return 'Enter a valid amount.'
  }

  if (comparison > 0) {
    return 'Amount cannot exceed outstanding balance.'
  }

  return null
}
