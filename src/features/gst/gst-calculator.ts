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

export function calculateGst(input: CalculateGstInput): GstCalculation {
  const taxableAmount = money(input.taxableAmount)
  const gstRate = money(input.gstRate)
  const totalGstAmount = taxableAmount.mul(gstRate).div(100)
  const supplyType =
    input.companyStateCode === input.partyStateCode
      ? 'intra_state'
      : 'inter_state'

  if (supplyType === 'intra_state') {
    const half = totalGstAmount.div(2)

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
