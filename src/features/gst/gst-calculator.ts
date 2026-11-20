import Decimal from 'decimal.js'

export type SupplyType = 'intra_state' | 'inter_state'

export type CalculateGstInput = {
  taxableAmount: string
  gstRate: string
  companyStateCode: string
  partyStateCode: string
}

export type GstCalculation = {
  taxableAmount: string
  gstRate: string
  supplyType: SupplyType
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
  totalAmount: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string): Decimal {
  return new Decimal(value)
}

function formatMoney(value: Decimal): string {
  return value.toFixed(2)
}

/**
 * Splits a stored intra-state GST total so CGST + SGST equals it to the
 * paisa. Totals from `calculateGst` are always even, giving equal halves;
 * an odd total (documents saved before equal halves) puts the extra paisa
 * in CGST.
 */
export function splitIntraStateGst(totalGstAmount: string | Decimal) {
  const total = new Decimal(totalGstAmount)
  const cgst = total.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  return { cgst: formatMoney(cgst), sgst: formatMoney(total.minus(cgst)) }
}

export function calculateGst(input: CalculateGstInput): GstCalculation {
  const taxableAmount = money(input.taxableAmount)
  const gstRate = money(input.gstRate)
  const supplyType =
    input.companyStateCode === input.partyStateCode
      ? 'intra_state'
      : 'inter_state'

  if (supplyType === 'intra_state') {
    // CGST and SGST are each taxable × rate/2, rounded, and must be equal
    // (IRP rejects unequal halves, error 2227); the total is their sum.
    const half = taxableAmount
      .mul(gstRate)
      .div(200)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    const totalGstAmount = half.mul(2)

    return {
      taxableAmount: formatMoney(taxableAmount),
      gstRate: formatMoney(gstRate),
      supplyType,
      cgstAmount: formatMoney(half),
      sgstAmount: formatMoney(half),
      igstAmount: '0.00',
      totalGstAmount: formatMoney(totalGstAmount),
      totalAmount: formatMoney(taxableAmount.plus(totalGstAmount)),
    }
  }

  const totalGstAmount = taxableAmount
    .mul(gstRate)
    .div(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  return {
    taxableAmount: formatMoney(taxableAmount),
    gstRate: formatMoney(gstRate),
    supplyType,
    cgstAmount: '0.00',
    sgstAmount: '0.00',
    igstAmount: formatMoney(totalGstAmount),
    totalGstAmount: formatMoney(totalGstAmount),
    totalAmount: formatMoney(taxableAmount.plus(totalGstAmount)),
  }
}
