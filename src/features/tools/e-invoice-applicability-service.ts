import Decimal from 'decimal.js'

export const E_INVOICE_EXEMPT_CATEGORIES = [
  { value: 'none', label: 'None of these' },
  { value: 'sez-unit', label: 'SEZ unit (not developer)' },
  { value: 'financial', label: 'Bank, insurer, NBFC, or financial institution' },
  { value: 'gta', label: 'Goods transport agency (GTA)' },
  { value: 'passenger-transport', label: 'Passenger transport service' },
  { value: 'multiplex', label: 'Cinema admission (multiplex)' },
  { value: 'government', label: 'Government department or local authority' },
] as const

export type EInvoiceExemptCategory = (typeof E_INVOICE_EXEMPT_CATEGORIES)[number]['value']

export type EInvoiceResult = {
  status: 'required' | 'not-required' | 'exempt' | 'invalid'
  reportingWindowDays: 30 | null
}

const E_INVOICE_THRESHOLD_CRORE = new Decimal(5)
const THIRTY_DAY_RULE_CRORE = new Decimal(10)
const E_WAY_BILL_THRESHOLD = new Decimal(50000)

function parseAmount(value: string): Decimal | null {
  const trimmed = value.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? new Decimal(trimmed) : null
}

/**
 * E-invoicing applies when aggregate turnover in any financial year since
 * 2017-18 exceeded ₹5 crore. From 1 April 2025, taxpayers at ₹10 crore and
 * above must report each invoice to the IRP within 30 days of its date.
 */
export function checkEInvoice(input: {
  highestAatoCrore: string
  exemptCategory: EInvoiceExemptCategory
}): EInvoiceResult {
  const aato = parseAmount(input.highestAatoCrore)
  if (!aato) return { status: 'invalid', reportingWindowDays: null }
  if (input.exemptCategory !== 'none') {
    return { status: 'exempt', reportingWindowDays: null }
  }
  if (!aato.greaterThan(E_INVOICE_THRESHOLD_CRORE)) {
    return { status: 'not-required', reportingWindowDays: null }
  }
  return {
    status: 'required',
    reportingWindowDays: aato.greaterThanOrEqualTo(THIRTY_DAY_RULE_CRORE) ? 30 : null,
  }
}

export type EWayBillResult = 'required' | 'not-required' | 'check-state-limit' | 'invalid'

/**
 * Inter-state movement above ₹50,000 needs an e-way bill. Within a state the
 * same limit applies unless the state has notified a higher one. Inter-state
 * job work and handicraft goods need one whatever the value.
 */
export function checkEWayBill(input: {
  consignmentValue: string
  interState: boolean
  specialCase: boolean
}): EWayBillResult {
  const value = parseAmount(input.consignmentValue)
  if (!value) return 'invalid'
  if (input.specialCase && input.interState) return 'required'
  if (!value.greaterThan(E_WAY_BILL_THRESHOLD)) return 'not-required'
  return input.interState ? 'required' : 'check-state-limit'
}
