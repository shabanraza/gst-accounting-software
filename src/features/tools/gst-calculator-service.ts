import Decimal from 'decimal.js'

export type GstMode = 'exclusive' | 'inclusive'

export type GstBreakdown = {
  taxableValue: string
  gstAmount: string
  total: string
  cgst: string
  sgst: string
  igst: string
}

function parseNonNegative(value: string): Decimal | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  return new Decimal(trimmed)
}

/** Splits a tax amount so CGST + SGST always equals the total to the paisa. */
export function splitIntraStateTax(gstAmount: Decimal) {
  const cgst = gstAmount.dividedBy(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  return { cgst, sgst: gstAmount.minus(cgst) }
}

export function calculateGst(input: {
  amount: string
  rate: string
  mode: GstMode
  interState: boolean
}): GstBreakdown | null {
  const amount = parseNonNegative(input.amount)
  const rate = parseNonNegative(input.rate)
  if (!amount || !rate || rate.greaterThan(100)) return null

  let taxableValue: Decimal
  let gstAmount: Decimal
  if (input.mode === 'exclusive') {
    taxableValue = amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    gstAmount = taxableValue
      .times(rate)
      .dividedBy(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  } else {
    const total = amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    taxableValue = total
      .times(100)
      .dividedBy(rate.plus(100))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    gstAmount = total.minus(taxableValue)
  }

  const split = input.interState
    ? { cgst: new Decimal(0), sgst: new Decimal(0) }
    : splitIntraStateTax(gstAmount)

  return {
    taxableValue: taxableValue.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    total: taxableValue.plus(gstAmount).toFixed(2),
    cgst: split.cgst.toFixed(2),
    sgst: split.sgst.toFixed(2),
    igst: input.interState ? gstAmount.toFixed(2) : '0.00',
  }
}

export type GstRatePage = {
  slug: string
  rate: string
  label: string
  appliesTo: string
}

/** Slabs in force after the GST rate rationalisation of 22 September 2025. */
export const GST_RATE_PAGES: ReadonlyArray<GstRatePage> = [
  {
    slug: '5-percent',
    rate: '5',
    label: '5%',
    appliesTo:
      'The merit rate for everyday essentials and many goods that sat at 12% before September 2025.',
  },
  {
    slug: '18-percent',
    rate: '18',
    label: '18%',
    appliesTo:
      'The standard rate for most goods and services, including many items that were taxed at 28% before September 2025.',
  },
  {
    slug: '40-percent',
    rate: '40',
    label: '40%',
    appliesTo:
      'The special de-merit rate for luxury and sin goods introduced in September 2025.',
  },
  {
    slug: '3-percent',
    rate: '3',
    label: '3%',
    appliesTo: 'Gold, silver, and jewellery.',
  },
  {
    slug: '0-25-percent',
    rate: '0.25',
    label: '0.25%',
    appliesTo: 'Rough diamonds and some precious stones.',
  },
]

export function getRatePage(slug: string): GstRatePage | undefined {
  return GST_RATE_PAGES.find((page) => page.slug === slug)
}
