import Decimal from 'decimal.js'

import type {
  GstReportDocument,
  GstReportPeriodInput,
} from '#/features/gst/gst-report-types.ts'

export type Gstr3bReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  outwardTaxableValue: string
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

export function buildGstr3bReport(input: GstReportPeriodInput): Gstr3bReport {
  const periodDocs = input.documents.filter((document) =>
    inPeriod(document, input),
  )

  let outwardTaxable = new Decimal(0)
  let outputGst = new Decimal(0)
  let inputGst = new Decimal(0)

  for (const document of periodDocs) {
    if (document.documentType === 'sales_invoice') {
      outwardTaxable = outwardTaxable.plus(document.taxableAmount)
      outputGst = outputGst.plus(document.totalGstAmount)
    }

    if (document.documentType === 'credit_note') {
      outwardTaxable = outwardTaxable.minus(document.taxableAmount)
      outputGst = outputGst.minus(document.totalGstAmount)
    }

    if (document.documentType === 'purchase_bill') {
      inputGst = inputGst.plus(document.totalGstAmount)
    }

    if (document.documentType === 'debit_note') {
      inputGst = inputGst.minus(document.totalGstAmount)
    }
  }

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    outwardTaxableValue: outwardTaxable.toFixed(2),
    outputGst: outputGst.toFixed(2),
    inputGst: inputGst.toFixed(2),
    netGstPayable: outputGst.minus(inputGst).toFixed(2),
  }
}
