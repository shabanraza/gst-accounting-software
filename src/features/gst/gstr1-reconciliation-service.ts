import Decimal from 'decimal.js'

import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type Gstr1PortalRow = {
  customerGstin: string
  invoiceNumber: string
  invoiceDate: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
}

export type Gstr1MatchStatus =
  | 'matched'
  | 'mismatched'
  | 'missing_in_books'
  | 'missing_in_gstr1'

export type Gstr1ReconciliationRow = {
  rowKey: string
  invoiceNumber: string
  customerGstin: string | null
  invoiceDate: string | null
  bookTaxableAmount: string | null
  bookTotalGstAmount: string | null
  portalTaxableAmount: string | null
  portalTotalGstAmount: string | null
  status: Gstr1MatchStatus
}

export type Gstr1ReconciliationSummary = {
  matchedCount: number
  mismatchedCount: number
  missingInBooksCount: number
  missingInGstr1Count: number
  booksTaxableTotal: string
  portalTaxableTotal: string
}

export type Gstr1ReconciliationReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  summary: Gstr1ReconciliationSummary
  rows: Array<Gstr1ReconciliationRow>
}

function normalizeInvoiceNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeGstin(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

export function buildGstr1RowKey(input: {
  customerGstin: string | null
  invoiceNumber: string
  invoiceDate?: string | null
}) {
  const gstin = normalizeGstin(input.customerGstin)
  const invoice = normalizeInvoiceNumber(input.invoiceNumber)
  const date = (input.invoiceDate ?? '').trim()
  return `${gstin}|${invoice}|${date}`
}

function inPeriod(date: string, periodStart: string, periodEnd: string) {
  return date >= periodStart && date <= periodEnd
}

function amountsMatch(left: string, right: string): boolean {
  return new Decimal(left).minus(new Decimal(right)).abs().lte('0.01')
}

function buildSummary(rows: Array<Gstr1ReconciliationRow>): Gstr1ReconciliationSummary {
  let booksTaxable = new Decimal(0)
  let portalTaxable = new Decimal(0)
  let matchedCount = 0
  let mismatchedCount = 0
  let missingInBooksCount = 0
  let missingInGstr1Count = 0

  for (const row of rows) {
    if (row.status === 'matched') matchedCount += 1
    if (row.status === 'mismatched') mismatchedCount += 1
    if (row.status === 'missing_in_books') missingInBooksCount += 1
    if (row.status === 'missing_in_gstr1') missingInGstr1Count += 1
    if (row.bookTaxableAmount) booksTaxable = booksTaxable.plus(row.bookTaxableAmount)
    if (row.portalTaxableAmount) {
      portalTaxable = portalTaxable.plus(row.portalTaxableAmount)
    }
  }

  return {
    matchedCount,
    mismatchedCount,
    missingInBooksCount,
    missingInGstr1Count,
    booksTaxableTotal: booksTaxable.toFixed(2),
    portalTaxableTotal: portalTaxable.toFixed(2),
  }
}

export async function reconcileGstr1(
  deps: {
    invoices: SalesInvoiceRepository
    parties: PartyRepository
  },
  input: {
    companyId: string
    periodStart: string
    periodEnd: string
    portalRows: Array<Gstr1PortalRow>
  },
): Promise<Gstr1ReconciliationReport> {
  const [invoices, partyList] = await Promise.all([
    deps.invoices.listByCompanyId(input.companyId),
    deps.parties.listByCompanyId(input.companyId),
  ])
  const partyById = new Map(partyList.map((party) => [party.id, party]))

  const periodInvoices = invoices.filter((invoice) =>
    inPeriod(invoice.invoiceDate, input.periodStart, input.periodEnd),
  )
  const periodPortalRows = input.portalRows.filter((row) =>
    inPeriod(row.invoiceDate, input.periodStart, input.periodEnd),
  )

  const rows: Array<Gstr1ReconciliationRow> = []
  const matchedPortalKeys = new Set<string>()

  for (const invoice of periodInvoices) {
    const party = partyById.get(invoice.customerId)
    const customerGstin = party?.gstin ?? null
    const normalizedInvoice = normalizeInvoiceNumber(invoice.invoiceNumber)

    const portalRow = periodPortalRows.find((row) => {
      const sameInvoice =
        normalizeInvoiceNumber(row.invoiceNumber) === normalizedInvoice
      const portalGstin = normalizeGstin(row.customerGstin)
      const bookGstin = normalizeGstin(customerGstin)
      if (bookGstin && portalGstin) {
        return sameInvoice && bookGstin === portalGstin
      }
      return sameInvoice
    })

    if (!portalRow) {
      const rowKey = buildGstr1RowKey({
        customerGstin,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
      })
      rows.push({
        rowKey,
        invoiceNumber: invoice.invoiceNumber,
        customerGstin,
        invoiceDate: invoice.invoiceDate,
        bookTaxableAmount: invoice.taxableAmount,
        bookTotalGstAmount: invoice.totalGstAmount,
        portalTaxableAmount: null,
        portalTotalGstAmount: null,
        status: 'missing_in_gstr1',
      })
      continue
    }

    const portalKey = buildGstr1RowKey({
      customerGstin: portalRow.customerGstin,
      invoiceNumber: portalRow.invoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })
    matchedPortalKeys.add(portalKey)

    const status: Gstr1MatchStatus =
      amountsMatch(invoice.taxableAmount, portalRow.taxableAmount) &&
      amountsMatch(invoice.totalGstAmount, portalRow.totalGstAmount)
        ? 'matched'
        : 'mismatched'

    rows.push({
      rowKey: portalKey,
      invoiceNumber: invoice.invoiceNumber,
      customerGstin: portalRow.customerGstin || customerGstin,
      invoiceDate: portalRow.invoiceDate,
      bookTaxableAmount: invoice.taxableAmount,
      bookTotalGstAmount: invoice.totalGstAmount,
      portalTaxableAmount: portalRow.taxableAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status,
    })
  }

  for (const portalRow of periodPortalRows) {
    const portalKey = buildGstr1RowKey({
      customerGstin: portalRow.customerGstin,
      invoiceNumber: portalRow.invoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })
    if (matchedPortalKeys.has(portalKey)) continue

    rows.push({
      rowKey: portalKey,
      invoiceNumber: portalRow.invoiceNumber,
      customerGstin: portalRow.customerGstin,
      invoiceDate: portalRow.invoiceDate,
      bookTaxableAmount: null,
      bookTotalGstAmount: null,
      portalTaxableAmount: portalRow.taxableAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status: 'missing_in_books',
    })
  }

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    summary: buildSummary(rows),
    rows,
  }
}
