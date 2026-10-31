import Decimal from 'decimal.js'

import type {
  GstReportDocument,
  GstReportPeriodInput,
} from '#/features/gst/gst-report-types.ts'

export type Gstr3bTaxSplit = {
  igst: string
  cgst: string
  sgst: string
}

export type Gstr3bReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  outwardTaxableValue: string
  /** Table 3.1(a): outward taxable supplies, net of credit notes. */
  outwardTaxableSupplies: Gstr3bTaxSplit & { taxableValue: string }
  /** Table 4(A)(5): ITC on purchase bills, net of debit notes. */
  eligibleItc: Gstr3bTaxSplit
  outputGst: string
  inputGst: string
  netGstPayable: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function inPeriod(document: GstReportDocument, input: GstReportPeriodInput) {
  return (
    document.companyId === input.companyId &&
    document.documentDate >= input.periodStart &&
    document.documentDate <= input.periodEnd
  )
}

type TaxTotals = {
  taxable: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  totalGst: Decimal
}

function emptyTotals(): TaxTotals {
  return {
    taxable: new Decimal(0),
    igst: new Decimal(0),
    cgst: new Decimal(0),
    sgst: new Decimal(0),
    totalGst: new Decimal(0),
  }
}

function addDocument(
  totals: TaxTotals,
  document: GstReportDocument,
  sign: 1 | -1,
) {
  totals.taxable = totals.taxable.plus(
    new Decimal(document.taxableAmount).times(sign),
  )
  totals.igst = totals.igst.plus(new Decimal(document.igstAmount).times(sign))
  totals.cgst = totals.cgst.plus(new Decimal(document.cgstAmount).times(sign))
  totals.sgst = totals.sgst.plus(new Decimal(document.sgstAmount).times(sign))
  totals.totalGst = totals.totalGst.plus(
    new Decimal(document.totalGstAmount).times(sign),
  )
}

function taxSplit(totals: TaxTotals): Gstr3bTaxSplit {
  return {
    igst: totals.igst.toFixed(2),
    cgst: totals.cgst.toFixed(2),
    sgst: totals.sgst.toFixed(2),
  }
}

export function buildGstr3bReport(input: GstReportPeriodInput): Gstr3bReport {
  const periodDocs = input.documents.filter((document) =>
    inPeriod(document, input),
  )

  const outward = emptyTotals()
  const itc = emptyTotals()

  for (const document of periodDocs) {
    if (document.documentType === 'sales_invoice') {
      addDocument(outward, document, 1)
    }

    if (document.documentType === 'credit_note') {
      addDocument(outward, document, -1)
    }

    if (document.documentType === 'purchase_bill') {
      addDocument(itc, document, 1)
    }

    if (document.documentType === 'debit_note') {
      addDocument(itc, document, -1)
    }
  }

  const outputGst = outward.totalGst
  const inputGst = itc.totalGst

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    outwardTaxableValue: outward.taxable.toFixed(2),
    outwardTaxableSupplies: {
      taxableValue: outward.taxable.toFixed(2),
      ...taxSplit(outward),
    },
    eligibleItc: taxSplit(itc),
    outputGst: outputGst.toFixed(2),
    inputGst: inputGst.toFixed(2),
    netGstPayable: outputGst.minus(inputGst).toFixed(2),
  }
}
