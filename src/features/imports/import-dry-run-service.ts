export type ImportPartyRow = {
  name: string
  partyType: 'customer' | 'supplier' | 'both' | string
  gstin: string | null
  stateCode: string
}

export type ImportStockRow = {
  itemName: string
  quantity: string
  unit: string
  rate: string
  /** Used only when the item does not exist yet. */
  hsn?: string
  gstRate?: string
}

export type ImportItemRow = {
  name: string
  hsn: string
  rate: string
  unit: string
  /** Percentage; 0 when omitted. */
  gstRate?: string
}

export type ImportOpeningBalanceRow = {
  ledgerCode: string
  openingDebit: string
  openingCredit: string
}

export type ImportRowError = {
  rowNumber: number
  messages: Array<string>
}

export type ImportDryRunResult = {
  validCount: number
  errors: Array<ImportRowError>
  wroteData: false
}

function isGstRate(value: string): boolean {
  return /^\d{1,2}(\.\d{1,2})?$/.test(value.trim()) && Number(value) <= 40
}

/** An omitted rate means 0%; a blank one means the file had none to give. */
function gstRateMessage(rate: string | undefined): string | null {
  if (rate === undefined) return null
  if (!rate.trim()) return 'GST rate is missing'
  return isGstRate(rate) ? null : 'GST rate must be a percentage between 0 and 40'
}

export function dryRunImportParties(
  rows: Array<ImportPartyRow>,
): ImportDryRunResult {
  const errors: Array<ImportRowError> = []
  let validCount = 0

  rows.forEach((row, index) => {
    const messages: Array<string> = []

    if (!row.name.trim()) {
      messages.push('Party name is required')
    }

    if (!['customer', 'supplier', 'both'].includes(row.partyType)) {
      messages.push('Party type must be customer, supplier, or both')
    }

    if (!/^\d{2}$/.test(row.stateCode)) {
      messages.push('State code must be 2 digits')
    }

    if (row.gstin && !/^[0-9A-Z]{15}$/i.test(row.gstin)) {
      messages.push('GSTIN must be 15 characters')
    }

    if (messages.length > 0) {
      errors.push({ rowNumber: index + 1, messages })
    } else {
      validCount += 1
    }
  })

  return { validCount, errors, wroteData: false }
}

export function dryRunImportOpeningStock(
  rows: Array<ImportStockRow>,
): ImportDryRunResult {
  const errors: Array<ImportRowError> = []
  let validCount = 0

  rows.forEach((row, index) => {
    const messages: Array<string> = []

    if (!row.itemName.trim()) {
      messages.push('Item name is required')
    }

    if (!/^\d+(\.\d{1,3})?$/.test(row.quantity) || Number(row.quantity) <= 0) {
      messages.push('Quantity must be a positive number')
    }

    const gstRateError = gstRateMessage(row.gstRate)
    if (gstRateError) {
      messages.push(gstRateError)
    }

    if (!row.unit.trim()) {
      messages.push('Unit is required')
    }

    if (messages.length > 0) {
      errors.push({ rowNumber: index + 1, messages })
    } else {
      validCount += 1
    }
  })

  return { validCount, errors, wroteData: false }
}

export function dryRunImportItems(
  rows: Array<ImportItemRow>,
): ImportDryRunResult {
  const errors: Array<ImportRowError> = []
  let validCount = 0

  rows.forEach((row, index) => {
    const messages: Array<string> = []

    if (!row.name.trim()) {
      messages.push('Item name is required')
    }

    if (!row.hsn.trim()) {
      messages.push('HSN is missing')
    } else if (!/^(\d{4}|\d{6}|\d{8})$/.test(row.hsn)) {
      messages.push('HSN must be 4, 6 or 8 digits')
    }

    const gstRateError = gstRateMessage(row.gstRate)
    if (gstRateError) {
      messages.push(gstRateError)
    }

    if (!/^\d+(\.\d{1,2})?$/.test(row.rate)) {
      messages.push('Rate must be a valid money amount')
    }

    if (!row.unit.trim()) {
      messages.push('Unit is required')
    }

    if (messages.length > 0) {
      errors.push({ rowNumber: index + 1, messages })
    } else {
      validCount += 1
    }
  })

  return { validCount, errors, wroteData: false }
}

export function dryRunImportOpeningBalances(
  rows: Array<ImportOpeningBalanceRow>,
): ImportDryRunResult {
  const errors: Array<ImportRowError> = []
  let validCount = 0
  let totalDebit = 0
  let totalCredit = 0

  rows.forEach((row, index) => {
    const messages: Array<string> = []

    if (!row.ledgerCode.trim()) {
      messages.push('Ledger code is required')
    }

    const debit = row.openingDebit.trim() || '0'
    const credit = row.openingCredit.trim() || '0'
    const debitValid = /^\d+(\.\d{1,2})?$/.test(debit)
    const creditValid = /^\d+(\.\d{1,2})?$/.test(credit)

    if (!debitValid || !creditValid) {
      messages.push('Opening debit/credit must be valid money amounts')
    }

    if (debitValid && creditValid && Number(debit) > 0 && Number(credit) > 0) {
      messages.push('Provide either opening debit or opening credit, not both')
    }

    if (
      debitValid &&
      creditValid &&
      Number(debit) === 0 &&
      Number(credit) === 0
    ) {
      messages.push('Opening debit or credit must be greater than zero')
    }

    if (messages.length > 0) {
      errors.push({ rowNumber: index + 1, messages })
    } else {
      validCount += 1
      totalDebit += Number(debit)
      totalCredit += Number(credit)
    }
  })

  if (errors.length === 0 && totalDebit.toFixed(2) !== totalCredit.toFixed(2)) {
    errors.push({
      rowNumber: 0,
      messages: ['Opening debits and credits must balance'],
    })
    validCount = 0
  }

  return { validCount, errors, wroteData: false }
}
