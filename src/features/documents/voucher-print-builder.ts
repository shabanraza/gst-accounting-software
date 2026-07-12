import Decimal from 'decimal.js'

import {
  amountInWords,
  isInterStateSupply,
  splitLineGst,
  stateLabel,
} from '#/features/documents/gst-invoice-format.ts'

import type {
  VoucherPrintCompanyInfo,
  VoucherPrintDocument,
  VoucherPrintHsnRow,
  VoucherPrintLine,
  VoucherPrintPartyInfo,
} from '#/features/documents/voucher-print-types.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type VoucherRawLine = {
  description: string
  hsnCode: string
  quantity: string
  unit: string
  rate: string
  discountAmount: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  lineTotal: string
}

type BuildVoucherInput = {
  kind: 'sales' | 'purchase'
  title: string
  documentNumber: string
  documentDate: string
  dueDate?: string
  paymentMode?: string
  narration: string
  company: VoucherPrintCompanyInfo
  party: VoucherPrintPartyInfo
  partyLabel: string
  placeOfSupplyCode: string
  reverseCharge: boolean
  copyLabel?: string
  rawLines: Array<VoucherRawLine>
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  outstandingAmount: string
}

export function buildVoucherPrintDocument(
  input: BuildVoucherInput,
): VoucherPrintDocument {
  const placeOfSupplyCode = input.placeOfSupplyCode || input.party.stateCode
  const isInterState = isInterStateSupply(
    input.company.stateCode,
    placeOfSupplyCode,
  )

  const lines: Array<VoucherPrintLine> = input.rawLines.map((line, index) => {
    const split = splitLineGst(
      { gstRate: line.gstRate, gstAmount: line.gstAmount },
      isInterState,
    )
    return {
      serial: index + 1,
      description: line.description,
      hsnCode: line.hsnCode,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      discountAmount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      gstRate: line.gstRate,
      gstAmount: line.gstAmount,
      lineTotal: line.lineTotal,
      ...split,
    }
  })

  const hsnMap = new Map<
    string,
    { taxable: Decimal; cgst: Decimal; sgst: Decimal; igst: Decimal }
  >()
  for (const line of lines) {
    const key = line.hsnCode || '—'
    const existing = hsnMap.get(key) ?? {
      taxable: new Decimal(0),
      cgst: new Decimal(0),
      sgst: new Decimal(0),
      igst: new Decimal(0),
    }
    existing.taxable = existing.taxable.plus(line.taxableAmount || '0')
    existing.cgst = existing.cgst.plus(line.cgstAmount || '0')
    existing.sgst = existing.sgst.plus(line.sgstAmount || '0')
    existing.igst = existing.igst.plus(line.igstAmount || '0')
    hsnMap.set(key, existing)
  }

  const hsnSummary: Array<VoucherPrintHsnRow> = [...hsnMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hsnCode, totals]) => ({
      hsnCode,
      taxableAmount: totals.taxable.toFixed(2),
      cgstAmount: totals.cgst.toFixed(2),
      sgstAmount: totals.sgst.toFixed(2),
      igstAmount: totals.igst.toFixed(2),
      totalTax: totals.cgst.plus(totals.sgst).plus(totals.igst).toFixed(2),
    }))

  const totalCgst = lines
    .reduce((sum, line) => sum.plus(line.cgstAmount || '0'), new Decimal(0))
    .toFixed(2)
  const totalSgst = lines
    .reduce((sum, line) => sum.plus(line.sgstAmount || '0'), new Decimal(0))
    .toFixed(2)
  const totalIgst = lines
    .reduce((sum, line) => sum.plus(line.igstAmount || '0'), new Decimal(0))
    .toFixed(2)

  return {
    kind: input.kind,
    title: input.title,
    documentNumber: input.documentNumber,
    documentDate: input.documentDate,
    dueDate: input.dueDate,
    paymentMode: input.paymentMode,
    narration: input.narration,
    company: input.company,
    party: input.party,
    partyLabel: input.partyLabel,
    placeOfSupplyLabel: stateLabel(placeOfSupplyCode),
    reverseCharge: input.reverseCharge,
    isInterState,
    copyLabel: input.copyLabel ?? 'Original for Recipient',
    lines,
    hsnSummary,
    freight: input.freight,
    packing: input.packing,
    roundOff: input.roundOff,
    billDiscount: input.billDiscount,
    taxableAmount: input.taxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalGstAmount: input.totalGstAmount,
    totalAmount: input.totalAmount,
    amountInWords: amountInWords(input.totalAmount),
    outstandingAmount: input.outstandingAmount,
  }
}
