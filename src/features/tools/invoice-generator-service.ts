import Decimal from 'decimal.js'

import {
  amountInWords,
  isInterStateSupply,
} from '#/features/documents/gst-invoice-format.ts'
import { splitIntraStateTax } from '#/features/tools/gst-calculator-service.ts'

export type InvoiceLineInput = {
  description: string
  hsn: string
  quantity: string
  rate: string
  gstRate: string
}

export type ComputedInvoiceLine = InvoiceLineInput & {
  taxableValue: string
  gstAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  lineTotal: string
}

export type ComputedInvoice = {
  interState: boolean
  lines: Array<ComputedInvoiceLine>
  taxableTotal: string
  cgstTotal: string
  sgstTotal: string
  igstTotal: string
  roundOff: string
  grandTotal: string
  amountInWords: string
}

function toDecimal(value: string): Decimal {
  const trimmed = value.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? new Decimal(trimmed) : new Decimal(0)
}

export function computeInvoice(input: {
  sellerStateCode: string
  placeOfSupplyCode: string
  lines: ReadonlyArray<InvoiceLineInput>
}): ComputedInvoice {
  const interState = isInterStateSupply(input.sellerStateCode, input.placeOfSupplyCode)
  let taxableTotal = new Decimal(0)
  let cgstTotal = new Decimal(0)
  let sgstTotal = new Decimal(0)
  let igstTotal = new Decimal(0)

  const lines = input.lines.map((line) => {
    const taxableValue = toDecimal(line.quantity)
      .times(toDecimal(line.rate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    const gstAmount = taxableValue
      .times(toDecimal(line.gstRate))
      .dividedBy(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    const split = interState
      ? { cgst: new Decimal(0), sgst: new Decimal(0) }
      : splitIntraStateTax(gstAmount)
    const igst = interState ? gstAmount : new Decimal(0)

    taxableTotal = taxableTotal.plus(taxableValue)
    cgstTotal = cgstTotal.plus(split.cgst)
    sgstTotal = sgstTotal.plus(split.sgst)
    igstTotal = igstTotal.plus(igst)

    return {
      ...line,
      taxableValue: taxableValue.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      cgstAmount: split.cgst.toFixed(2),
      sgstAmount: split.sgst.toFixed(2),
      igstAmount: igst.toFixed(2),
      lineTotal: taxableValue.plus(gstAmount).toFixed(2),
    }
  })

  const exactTotal = taxableTotal.plus(cgstTotal).plus(sgstTotal).plus(igstTotal)
  const grandTotal = exactTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)

  return {
    interState,
    lines,
    taxableTotal: taxableTotal.toFixed(2),
    cgstTotal: cgstTotal.toFixed(2),
    sgstTotal: sgstTotal.toFixed(2),
    igstTotal: igstTotal.toFixed(2),
    roundOff: grandTotal.minus(exactTotal).toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    amountInWords: amountInWords(grandTotal.toFixed(2)),
  }
}
