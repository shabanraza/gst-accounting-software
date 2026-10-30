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
  supplyType: GstReportDocument['supplyType']
  reverseCharge: boolean
  /** Taxable value and tax per GST rate, as the portal asks for each invoice. */
  rates: Array<Gstr1RateRow>
}

export type Gstr1RateRow = {
  gstRate: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
}

/** One GSTR-1 Table 7 row: B2C small supplies for a place of supply and rate. */
export type Gstr1B2csRow = Gstr1RateRow & {
  placeOfSupply: string
  supplyType: GstReportDocument['supplyType']
}

export type Gstr1Report = {
  companyId: string
  periodStart: string
  periodEnd: string
  b2b: Array<Gstr1Line>
  b2cl: Array<Gstr1Line>
  b2cs: Array<Gstr1B2csRow>
  /** Table 9B: credit notes to registered customers. */
  cdnr: Array<Gstr1Line>
  /** Table 9B: credit notes to unregistered customers against B2C large invoices. */
  cdnur: Array<Gstr1Line>
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

/** A credit note follows the invoice it was issued against. */
function isB2cLarge(document: GstReportDocument) {
  const invoice =
    document.documentType === 'credit_note'
      ? document.originalInvoice
      : document
  return (
    invoice !== undefined &&
    document.supplyType === 'inter_state' &&
    new Decimal(invoice.totalAmount).gt(b2cLargeLimit(invoice.documentDate))
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
    supplyType: document.supplyType,
    reverseCharge: document.reverseCharge ?? false,
    rates: rateLinesOf(document).map((line) =>
      rateRow(
        document.supplyType,
        new Decimal(line.gstRate),
        new Decimal(line.taxableAmount),
        new Decimal(line.gstAmount),
      ),
    ),
  }
}

function rateRow(
  supplyType: GstReportDocument['supplyType'],
  gstRate: Decimal,
  taxable: Decimal,
  gst: Decimal,
): Gstr1RateRow {
  const isIntraState = supplyType === 'intra_state'
  const half = gst.div(2).toFixed(2)
  return {
    gstRate: gstRate.toFixed(2),
    taxableAmount: taxable.toFixed(2),
    cgstAmount: isIntraState ? half : '0.00',
    sgstAmount: isIntraState ? half : '0.00',
    igstAmount: isIntraState ? '0.00' : gst.toFixed(2),
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
    // Credit notes on B2C small sales reduce the same Table 7 row.
    const sign = document.documentType === 'credit_note' ? -1 : 1
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
      group.taxable = group.taxable.plus(
        new Decimal(line.taxableAmount).mul(sign),
      )
      group.gst = group.gst.plus(new Decimal(line.gstAmount).mul(sign))
      groups.set(key, group)
    }
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        left.placeOfSupply.localeCompare(right.placeOfSupply) ||
        left.gstRate.comparedTo(right.gstRate),
    )
    .map((group) => ({
      placeOfSupply: group.placeOfSupply,
      supplyType: group.supplyType,
      ...rateRow(group.supplyType, group.gstRate, group.taxable, group.gst),
    }))
}

function sumTaxable(rows: Array<{ taxableAmount: string }>) {
  return rows.reduce((sum, row) => sum.plus(row.taxableAmount), new Decimal(0))
}

export function buildGstr1Report(input: GstReportPeriodInput): Gstr1Report {
  const periodDocs = input.documents.filter((document) =>
    inPeriod(document, input),
  )
  const sales = periodDocs.filter(
    (document) => document.documentType === 'sales_invoice',
  )
  // Debit notes here are purchase returns, which belong to GSTR-3B, not GSTR-1.
  const creditNotes = periodDocs.filter(
    (document) => document.documentType === 'credit_note',
  )
  const b2cSales = sales.filter((document) => !document.partyGstin)
  const b2cNotes = creditNotes.filter((document) => !document.partyGstin)

  const b2b = sales.filter((document) => document.partyGstin).map(toLine)
  const b2cl = b2cSales.filter(isB2cLarge).map(toLine)
  const b2cs = buildB2cs(
    [...b2cSales, ...b2cNotes].filter((document) => !isB2cLarge(document)),
  )
  const cdnr = creditNotes.filter((document) => document.partyGstin).map(toLine)
  const cdnur = b2cNotes.filter(isB2cLarge).map(toLine)

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
    cdnr,
    cdnur,
    totalTaxableValue: invoicesTaxable
      .minus(sumTaxable(cdnr))
      .minus(sumTaxable(cdnur))
      .toFixed(2),
  }
}

/** GSTN dates are dd-mm-yyyy. */
function portalDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

function portalItems(line: Gstr1Line, igstOnly = false) {
  return line.rates.map((rate, index) => ({
    num: index + 1,
    itm_det: igstOnly
      ? {
          rt: Number(rate.gstRate),
          txval: Number(rate.taxableAmount),
          iamt: Number(rate.igstAmount),
          csamt: 0,
        }
      : {
          rt: Number(rate.gstRate),
          txval: Number(rate.taxableAmount),
          iamt: Number(rate.igstAmount),
          camt: Number(rate.cgstAmount),
          samt: Number(rate.sgstAmount),
          csamt: 0,
        },
  }))
}

/** Groups lines under a key, keeping first-seen order. */
function groupBy<T>(
  lines: Array<Gstr1Line>,
  keyOf: (line: Gstr1Line) => string,
  map: (line: Gstr1Line) => T,
) {
  const groups = new Map<string, Array<T>>()
  for (const line of lines) {
    const key = keyOf(line)
    groups.set(key, [...(groups.get(key) ?? []), map(line)])
  }
  return [...groups.entries()]
}

/**
 * GSTR-1 upload file in the GSTN offline-tool layout (amounts as numbers).
 * Cess is not tracked, so `csamt` is always 0.
 */
export function buildGstr1Json(report: Gstr1Report, gstin: string): string {
  return JSON.stringify(
    {
      gstin,
      fp: report.periodEnd.slice(5, 7) + report.periodEnd.slice(0, 4),
      b2b: groupBy(
        report.b2b,
        (line) => line.partyGstin ?? '',
        (line) => ({
          inum: line.invoiceNumber,
          idt: portalDate(line.documentDate),
          val: Number(line.totalAmount),
          pos: line.placeOfSupply,
          rchrg: line.reverseCharge ? 'Y' : 'N',
          inv_typ: 'R',
          itms: portalItems(line),
        }),
      ).map(([ctin, inv]) => ({ ctin, inv })),
      b2cl: groupBy(
        report.b2cl,
        (line) => line.placeOfSupply,
        (line) => ({
          inum: line.invoiceNumber,
          idt: portalDate(line.documentDate),
          val: Number(line.totalAmount),
          itms: portalItems(line, true),
        }),
      ).map(([pos, inv]) => ({ pos, inv })),
      b2cs: report.b2cs.map((row) => ({
        sply_ty: row.supplyType === 'intra_state' ? 'INTRA' : 'INTER',
        pos: row.placeOfSupply,
        typ: 'OE',
        rt: Number(row.gstRate),
        txval: Number(row.taxableAmount),
        iamt: Number(row.igstAmount),
        camt: Number(row.cgstAmount),
        samt: Number(row.sgstAmount),
        csamt: 0,
      })),
      cdnr: groupBy(
        report.cdnr,
        (line) => line.partyGstin ?? '',
        (line) => ({
          ntty: 'C',
          nt_num: line.invoiceNumber,
          nt_dt: portalDate(line.documentDate),
          pos: line.placeOfSupply,
          rchrg: line.reverseCharge ? 'Y' : 'N',
          inv_typ: 'R',
          val: Number(line.totalAmount),
          itms: portalItems(line),
        }),
      ).map(([ctin, nt]) => ({ ctin, nt })),
      cdnur: report.cdnur.map((line) => ({
        typ: 'B2CL',
        ntty: 'C',
        nt_num: line.invoiceNumber,
        nt_dt: portalDate(line.documentDate),
        pos: line.placeOfSupply,
        val: Number(line.totalAmount),
        itms: portalItems(line, true),
      })),
    },
    null,
    2,
  )
}
