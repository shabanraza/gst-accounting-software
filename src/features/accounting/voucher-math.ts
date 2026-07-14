import Decimal from 'decimal.js'

import { calculateGst } from '#/features/gst/gst-calculator.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type SupplyRegion = 'local' | 'central'
export type TaxMode = 'exclusive' | 'inclusive'

export type VoucherLineDraft = {
  key: string
  itemId: string
  itemName: string
  hsnCode: string
  gstRate: string
  unit: string
  uqc: string
  quantity: string
  rate: string
  discountPercent: string
  godownName: string
}

export type ComputedVoucherLine = VoucherLineDraft & {
  grossAmount: string
  discountAmount: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  lineTotal: string
}

export type VoucherSundry = {
  freight: string
  packing: string
  roundOff: string
  billDiscount?: string
}

export type VoucherTotals = {
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
  sundryTotal: string
  billDiscountAmount: string
  grandTotal: string
}

function money(value: string) {
  const parsed = Number(value)
  return new Decimal(Number.isFinite(parsed) ? parsed : 0)
}

function format(value: Decimal) {
  return value.toFixed(2)
}

export function isValidStateCode(code: string | null | undefined): boolean {
  return /^[0-9]{2}$/.test((code ?? '').trim())
}

export function resolveStateCode(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const normalized = (candidate ?? '').trim()
    if (isValidStateCode(normalized)) {
      return normalized
    }
  }
  return ''
}

export function resolvePlaceOfSupply(input: {
  region: SupplyRegion
  selectedPlaceOfSupply: string
  partyStateCode: string
  companyStateCode: string
  fallbackStateCode?: string
}): string {
  const fallback = input.fallbackStateCode ?? '27'
  const companyState = resolveStateCode(input.companyStateCode, fallback)
  const partyState = resolveStateCode(input.partyStateCode, companyState)
  const selected = resolveStateCode(input.selectedPlaceOfSupply)

  if (input.region === 'local') {
    return companyState
  }

  return selected || partyState || companyState
}

export function partyStateForRegion(
  region: SupplyRegion,
  partyStateCode: string,
  companyStateCode: string,
) {
  if (region === 'local') {
    return companyStateCode
  }

  return partyStateCode === companyStateCode ? '24' : partyStateCode
}

export function computeVoucherLine(
  line: VoucherLineDraft,
  region: SupplyRegion,
  partyStateCode: string,
  taxMode: TaxMode = 'exclusive',
  companyStateCode = '27',
): ComputedVoucherLine {
  const qty = money(line.quantity)
  const rate = money(line.rate)
  const discountPercent = money(line.discountPercent)
  const gstRate = money(line.gstRate || '0')
  const grossAmount = qty.mul(rate)
  const discountAmount = grossAmount.mul(discountPercent).div(100)
  const netAmount = Decimal.max(
    grossAmount.minus(discountAmount),
    new Decimal(0),
  )

  let taxableAmount = netAmount
  if (taxMode === 'inclusive' && gstRate.gt(0)) {
    taxableAmount = netAmount.mul(100).div(gstRate.plus(100))
  }

  const gst = calculateGst({
    taxableAmount: format(taxableAmount),
    gstRate: line.gstRate || '0',
    companyStateCode,
    partyStateCode: partyStateForRegion(
      region,
      partyStateCode,
      companyStateCode,
    ),
  })

  return {
    ...line,
    grossAmount: format(grossAmount),
    discountAmount: format(discountAmount),
    taxableAmount: gst.taxableAmount,
    cgstAmount: gst.cgstAmount,
    sgstAmount: gst.sgstAmount,
    igstAmount: gst.igstAmount,
    lineTotal: taxMode === 'inclusive' ? format(netAmount) : gst.totalAmount,
  }
}

export function computeVoucherTotals(
  lines: Array<ComputedVoucherLine>,
  sundry: VoucherSundry,
): VoucherTotals {
  const taxableAmount = lines.reduce(
    (sum, line) => sum.plus(money(line.taxableAmount)),
    new Decimal(0),
  )
  const cgstAmount = lines.reduce(
    (sum, line) => sum.plus(money(line.cgstAmount)),
    new Decimal(0),
  )
  const sgstAmount = lines.reduce(
    (sum, line) => sum.plus(money(line.sgstAmount)),
    new Decimal(0),
  )
  const igstAmount = lines.reduce(
    (sum, line) => sum.plus(money(line.igstAmount)),
    new Decimal(0),
  )
  const totalGstAmount = cgstAmount.plus(sgstAmount).plus(igstAmount)
  const billDiscountAmount = money(sundry.billDiscount ?? '0')
  const sundryTotal = money(sundry.freight)
    .plus(money(sundry.packing))
    .plus(money(sundry.roundOff))
    .minus(billDiscountAmount)
  const grandTotal = taxableAmount.plus(totalGstAmount).plus(sundryTotal)

  return {
    taxableAmount: format(taxableAmount),
    cgstAmount: format(cgstAmount),
    sgstAmount: format(sgstAmount),
    igstAmount: format(igstAmount),
    totalGstAmount: format(totalGstAmount),
    sundryTotal: format(sundryTotal),
    billDiscountAmount: format(billDiscountAmount),
    grandTotal: format(grandTotal),
  }
}

export function emptyVoucherLine(defaultGodown = ''): VoucherLineDraft {
  return {
    key: crypto.randomUUID(),
    itemId: '',
    itemName: '',
    hsnCode: '',
    gstRate: '0.00',
    unit: '',
    uqc: '',
    quantity: '1',
    rate: '0.00',
    discountPercent: '0',
    godownName: defaultGodown,
  }
}

export function createEmptyVoucherLines(
  count = 1,
  defaultGodown = '',
): Array<VoucherLineDraft> {
  return Array.from({ length: count }, () => emptyVoucherLine(defaultGodown))
}
