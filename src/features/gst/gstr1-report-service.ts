import Decimal from 'decimal.js'

import type {
  GstRateLine,
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

/** One GSTR-1 Table 7 row: B2C small supplies for a place of supply and rate. */
export type Gstr1B2csRow = {
  placeOfSupply: string
  supplyType: 'intra_state' | 'inter_state'
  gstRate: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
}

export type Gstr1Report = {
  companyId: string
  periodStart: string
  periodEnd: string
  b2b: Array<Gstr1Line>
  b2cl: Array<Gstr1Line>
  b2cs: Array<Gstr1B2csRow>
  creditDebitNotes: Array<Gstr1Line>
  totalTaxableValue: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/**
 * Inter-state invoices to unregistered buyers above this value go to B2C large
 * (Table 5). CGST Notification 12/2024 lowered it from ₹2.5 lakh from 1 Aug 2024.
 */
function b2cLargeLimit(documentDate: string) {
  return documentDate >= '2024-08-01' ? 100000 : 250000
}

function inPeriod(document: GstReportDocument, input: GstReportPeriodInput) {
  return (
    document.companyId === input.companyId &&
    document.documentDate >= input.periodStart &&
    document.documentDate <= input.periodEnd
  )
}

function isB2cLarge(document: GstReportDocument) {
  return (
    document.supplyType === 'inter_state' &&
    new Decimal(document.totalAmount).gt(b2cLargeLimit(document.documentDate))
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

/** Falls back to one line at the invoice's effective rate when lines are absent. */
function rateLinesOf(document: GstReportDocument): Array<GstRateLine> {
  if (document.rateLines?.length) return document.rateLines
  const taxable = new Decimal(document.taxableAmount)
  const rate = taxable.isZero()
    ? new Decimal(0)
    : new Decimal(document.totalGstAmount).div(taxable).mul(100)
  return [
    {
      gstRate: rate.toFixed(2),
      taxableAmount: document.taxableAmount,
      gstAmount: document.totalGstAmount,
    },
  ]
}

function buildB2cs(documents: Array<GstReportDocument>): Array<Gstr1B2csRow> {
  const groups = new Map<
    string,
    {
      placeOfSupply: string
      supplyType: Gstr1B2csRow['supplyType']
      gstRate: Decimal
      taxable: Decimal
      gst: Decimal
    }
  >()

  for (const document of documents) {
    for (const line of rateLinesOf(document)) {
      const gstRate = new Decimal(line.gstRate)
      const key = `${document.placeOfSupply}|${document.supplyType}|${gstRate.toFixed(2)}`
      const group = groups.get(key) ?? {
        placeOfSupply: document.placeOfSupply,
        supplyType: document.supplyType,
        gstRate,
        taxable: new Decimal(0),
        gst: new Decimal(0),
      }
      group.taxable = group.taxable.plus(line.taxableAmount)
      group.gst = group.gst.plus(line.gstAmount)
      groups.set(key, group)
    }
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        left.placeOfSupply.localeCompare(right.placeOfSupply) ||
        left.gstRate.comparedTo(right.gstRate),
    )
    .map((group) => {
      const isIntraState = group.supplyType === 'intra_state'
      const half = group.gst.div(2).toFixed(2)
      return {
        placeOfSupply: group.placeOfSupply,
        supplyType: group.supplyType,
        gstRate: group.gstRate.toFixed(2),
        taxableAmount: group.taxable.toFixed(2),
        cgstAmount: isIntraState ? half : '0.00',
        sgstAmount: isIntraState ? half : '0.00',
        igstAmount: isIntraState ? '0.00' : group.gst.toFixed(2),
      }
    })
}

function sumTaxable(rows: Array<{ taxableAmount: string }>) {
  return rows.reduce(
    (sum, row) => sum.plus(row.taxableAmount),
    new Decimal(0),
  )
}

export function buildGstr1Report(input: GstReportPeriodInput): Gstr1Report {
  const periodDocs = input.documents.filter((document) =>
    inPeriod(document, input),
  )
  const sales = periodDocs.filter(
    (document) => document.documentType === 'sales_invoice',
  )
  const b2cSales = sales.filter((document) => !document.partyGstin)

  const b2b = sales.filter((document) => document.partyGstin).map(toLine)
  const b2cl = b2cSales.filter(isB2cLarge).map(toLine)
  const b2cs = buildB2cs(b2cSales.filter((document) => !isB2cLarge(document)))

  const creditDebitNotes = periodDocs
    .filter(
      (document) =>
        document.documentType === 'credit_note' ||
        document.documentType === 'debit_note',
    )
    .map(toLine)

  const invoicesTaxable = sumTaxable(b2b)
    .plus(sumTaxable(b2cl))
    .plus(sumTaxable(b2cs))

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    b2b,
    b2cl,
    b2cs,
    creditDebitNotes,
    totalTaxableValue: invoicesTaxable
      .minus(sumTaxable(creditDebitNotes))
      .toFixed(2),
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
      b2cl: report.b2cl.map((line) => ({
        inum: line.invoiceNumber,
        idt: line.documentDate,
        pos: line.placeOfSupply,
        val: line.totalAmount,
        txval: line.taxableAmount,
        igst: line.igstAmount,
      })),
      b2cs: report.b2cs.map((row) => ({
        sply_ty: row.supplyType === 'intra_state' ? 'INTRA' : 'INTER',
        pos: row.placeOfSupply,
        rt: row.gstRate,
        txval: row.taxableAmount,
        cgst: row.cgstAmount,
        sgst: row.sgstAmount,
        igst: row.igstAmount,
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
