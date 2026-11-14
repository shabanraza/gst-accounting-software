import Decimal from 'decimal.js'

/** NPCI-style virtual payment address: handle@bank, e.g. `shop@okhdfc`. */
const UPI_ID_PATTERN = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/

export function isValidUpiId(value: string): boolean {
  return UPI_ID_PATTERN.test(value)
}

/**
 * Builds a `upi://pay` deep link that any UPI app can scan. Returns null when
 * the company has no valid UPI ID or nothing is left to pay.
 */
export function buildUpiUri(input: {
  vpa: string
  payeeName: string
  amount: string
  note: string
}): string | null {
  const vpa = input.vpa.trim()
  if (!isValidUpiId(vpa)) return null

  let amount: Decimal
  try {
    amount = new Decimal(input.amount.trim() || '0').toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP,
    )
  } catch {
    return null
  }
  if (!amount.isFinite() || amount.lte(0)) return null

  // `pa` is safe unencoded: the pattern above allows only [\w.-] and one `@`,
  // and some UPI apps fail to read an encoded `%40`.
  return [
    `upi://pay?pa=${vpa}`,
    `pn=${encodeURIComponent(input.payeeName.trim())}`,
    `am=${amount.toFixed(2)}`,
    'cu=INR',
    `tn=${encodeURIComponent(input.note.trim())}`,
  ].join('&')
}
