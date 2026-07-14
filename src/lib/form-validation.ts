import Decimal from 'decimal.js'
import { toast } from 'sonner'

import { isValidStateCode } from '#/features/accounting/voucher-math.ts'

export const WORKSPACE_LOADING_MESSAGE =
  'Workspace is still loading. Try again in a moment.'
export const NO_COMPANY_MESSAGE =
  'Select or create a company before continuing.'

export function showValidationError(message: string): false {
  toast.error(message)
  return false
}

export function failForm(
  setFormError: (message: string | null) => void,
  message: string,
): false {
  setFormError(message)
  toast.error(message)
  return false
}

export function requireWorkspace(
  companyId: string | null | undefined,
  isReady = true,
): companyId is string {
  if (companyId) {
    return true
  }
  showValidationError(
    isReady ? NO_COMPANY_MESSAGE : WORKSPACE_LOADING_MESSAGE,
  )
  return false
}

export function requireTrimmed(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    showValidationError(`${label} is required.`)
    return null
  }
  return trimmed
}

export function requireSelection(
  value: string | null | undefined,
  label: string,
): string | null {
  if (!value?.trim()) {
    showValidationError(`Select ${label.toLowerCase()}.`)
    return null
  }
  return value
}

export function parsePositiveDecimal(
  value: string | null | undefined,
): Decimal | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return new Decimal(parsed)
}

export function requirePositiveAmount(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    showValidationError(`${label} is required.`)
    return null
  }
  if (!parsePositiveDecimal(trimmed)) {
    showValidationError(`${label} must be greater than zero.`)
    return null
  }
  return trimmed
}

export function requirePositiveQuantity(
  value: string | null | undefined,
  label = 'Quantity',
): string | null {
  return requirePositiveAmount(value, label)
}

export function requireStateCode(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = (value ?? '').trim()
  if (!isValidStateCode(trimmed)) {
    showValidationError(`${label} must be a valid 2-digit state code.`)
    return null
  }
  return trimmed
}

export function requireAmountNotExceeding(
  amount: string,
  maximum: string,
  label: string,
): boolean {
  const amountDecimal = parsePositiveDecimal(amount)
  if (!amountDecimal) {
    return false
  }
  const maxDecimal = parsePositiveDecimal(maximum)
  if (!maxDecimal) {
    showValidationError(`${label} cannot exceed the outstanding balance.`)
    return false
  }
  if (amountDecimal.gt(maxDecimal)) {
    showValidationError(
      `${label} cannot exceed outstanding balance (${maxDecimal.toFixed(2)}).`,
    )
    return false
  }
  return true
}

export function requireBalancedJournal(
  lines: Array<{ debit: string; credit: string }>,
): boolean {
  let debitTotal = new Decimal(0)
  let creditTotal = new Decimal(0)

  for (const line of lines) {
    const debit = Number(line.debit || 0)
    const credit = Number(line.credit || 0)
    if (Number.isFinite(debit)) {
      debitTotal = debitTotal.plus(debit)
    }
    if (Number.isFinite(credit)) {
      creditTotal = creditTotal.plus(credit)
    }
  }

  if (debitTotal.lte(0)) {
    showValidationError('Enter debit and credit amounts.')
    return false
  }

  if (!debitTotal.equals(creditTotal)) {
    showValidationError(
      `Debits (${debitTotal.toFixed(2)}) must equal credits (${creditTotal.toFixed(2)}).`,
    )
    return false
  }

  return true
}

export function requireVoucherLines(
  lines: Array<{ quantity: string; rate: string }>,
): boolean {
  if (lines.length === 0) {
    showValidationError('Add at least one item row.')
    return false
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const row = index + 1
    if (!parsePositiveDecimal(line.quantity)) {
      showValidationError(`Row ${row}: quantity must be greater than zero.`)
      return false
    }
    if (!parsePositiveDecimal(line.rate)) {
      showValidationError(`Row ${row}: rate must be greater than zero.`)
      return false
    }
  }

  return true
}

export function requireLedgers(
  ledgerBySystemKey: Record<string, string | undefined>,
  keys: Array<string>,
  label = 'Ledger',
): boolean {
  for (const key of keys) {
    if (!ledgerBySystemKey[key]) {
      showValidationError(`${label} mapping missing: ${key.replaceAll('_', ' ')}.`)
      return false
    }
  }
  return true
}
