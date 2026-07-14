import Decimal from 'decimal.js'

import type {
  GstReportDocument,
  GstReportPeriodInput,
} from '#/features/gst/gst-report-types.ts'

export type Gstr1Line = {
  invoiceNumber: string
  documentDate: string
  partyGstin: string | null
  partyName: string
  placeOfSupply: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
  totalAmount: string
}

export type Gstr1Report = {
  companyId: string
  periodStart: string
  periodEnd: string
  b2b: Array<Gstr1Line>
  creditDebitNotes: Array<Gstr1Line>
  totalTaxableValue: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function inPeriod(document: GstReportDocument, input: GstReportPeriodInput) {
  return (
    document.companyId === input.companyId &&
    document.documentDate >= input.periodStart &&
    document.documentDate <= input.periodEnd
  )
}

function toLine(document: GstReportDocument): Gstr1Line {
  return {
    invoiceNumber: document.invoiceNumber,
    documentDate: document.documentDate,
    partyGstin: document.partyGstin,
    partyName: document.partyName,
    placeOfSupply: document.placeOfSupply,
    taxableAmount: document.taxableAmount,
    cgstAmount: document.cgstAmount,
    sgstAmount: document.sgstAmount,
    igstAmount: document.igstAmount,
    totalGstAmount: document.totalGstAmount,
    totalAmount: document.totalAmount,
  }
}

export function buildGstr1Report(input: GstReportPeriodInput): Gstr1Report {
  const periodDocs = input.documents.filter((document) =>
    inPeriod(document, input),
  )

  const b2b = periodDocs
    .filter(
      (document) =>
        document.documentType === 'sales_invoice' &&
        Boolean(document.partyGstin),
    )
    .map(toLine)

  const creditDebitNotes = periodDocs
    .filter(
      (document) =>
        document.documentType === 'credit_note' ||
        document.documentType === 'debit_note',
    )
    .map(toLine)

  const invoicesTaxable = b2b.reduce(
    (sum, line) => sum.plus(line.taxableAmount),
    new Decimal(0),
  )
  const notesTaxable = creditDebitNotes.reduce(
    (sum, line) => sum.plus(line.taxableAmount),
    new Decimal(0),
  )

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    b2b,
    creditDebitNotes,
    totalTaxableValue: invoicesTaxable.minus(notesTaxable).toFixed(2),
  }
}

export function buildGstr1Json(report: Gstr1Report): string {
  return JSON.stringify(
    {
      gstin: '',
      fp: report.periodEnd.slice(5, 7) + report.periodEnd.slice(0, 4),
      b2b: report.b2b.map((line) => ({
        inum: line.invoiceNumber,
        idt: line.documentDate,
        ctin: line.partyGstin,
        pos: line.placeOfSupply,
        val: line.totalAmount,
        txval: line.taxableAmount,
        cgst: line.cgstAmount,
        sgst: line.sgstAmount,
        igst: line.igstAmount,
      })),
      cdnr: report.creditDebitNotes.map((line) => ({
        nt_num: line.invoiceNumber,
        nt_dt: line.documentDate,
        ctin: line.partyGstin,
        pos: line.placeOfSupply,
        val: line.totalAmount,
        txval: line.taxableAmount,
        cgst: line.cgstAmount,
        sgst: line.sgstAmount,
        igst: line.igstAmount,
      })),
    },
    null,
    2,
  )
}
