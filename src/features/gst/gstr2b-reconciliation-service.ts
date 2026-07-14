import Decimal from 'decimal.js'

import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type {
  Gstr2bItcStatus,
  GstReconciliationRepository,
} from '#/features/gst/gst-reconciliation-store.ts'

export type Gstr2bRow = {
  supplierGstin: string
  supplierInvoiceNumber: string
  invoiceDate: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
}

export type Gstr2bMatchStatus =
  | 'matched'
  | 'mismatched'
  | 'missing_in_books'
  | 'missing_in_2b'

export type Gstr2bReconciliationRow = {
  rowKey: string
  supplierInvoiceNumber: string
  supplierGstin: string | null
  invoiceDate: string | null
  bookTaxableAmount: string | null
  bookCgstAmount: string | null
  bookSgstAmount: string | null
  bookIgstAmount: string | null
  bookTotalGstAmount: string | null
  portalTaxableAmount: string | null
  portalCgstAmount: string | null
  portalSgstAmount: string | null
  portalIgstAmount: string | null
  portalTotalGstAmount: string | null
  status: Gstr2bMatchStatus
  itcStatus: Gstr2bItcStatus
}

export type Gstr2bReconciliationSummary = {
  matchedCount: number
  mismatchedCount: number
  missingInBooksCount: number
  missingIn2bCount: number
  booksItcTotal: string
  portalItcTotal: string
  acceptedItcTotal: string
  rejectedItcTotal: string
  pendingItcTotal: string
  claimableItcTotal: string
}

export type Gstr2bReconciliationReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  summary: Gstr2bReconciliationSummary
  rows: Array<Gstr2bReconciliationRow>
}

function normalizeInvoiceNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeGstin(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

export function buildGstr2bRowKey(input: {
  supplierGstin: string | null
  supplierInvoiceNumber: string
  invoiceDate?: string | null
}) {
  const gstin = normalizeGstin(input.supplierGstin)
  const invoice = normalizeInvoiceNumber(input.supplierInvoiceNumber)
  const date = (input.invoiceDate ?? '').trim()
  return `${gstin}|${invoice}|${date}`
}

function inPeriod(date: string, periodStart: string, periodEnd: string) {
  return date >= periodStart && date <= periodEnd
}

function amountsMatch(left: string, right: string): boolean {
  return new Decimal(left).minus(new Decimal(right)).abs().lte('0.01')
}

function splitPurchaseGst(
  totalGstAmount: string,
  companyStateCode: string,
  partyStateCode: string,
) {
  const supplyType =
    partyStateCode === companyStateCode ? 'intra_state' : 'inter_state'
  const half = new Decimal(totalGstAmount).div(2).toFixed(2)
  return {
    cgstAmount: supplyType === 'intra_state' ? half : '0.00',
    sgstAmount: supplyType === 'intra_state' ? half : '0.00',
    igstAmount: supplyType === 'inter_state' ? totalGstAmount : '0.00',
  }
}

function portalItcForRow(row: Gstr2bReconciliationRow) {
  if (row.portalTotalGstAmount) return row.portalTotalGstAmount
  return '0.00'
}

function buildSummary(rows: Array<Gstr2bReconciliationRow>): Gstr2bReconciliationSummary {
  let booksItc = new Decimal(0)
  let portalItc = new Decimal(0)
  let acceptedItc = new Decimal(0)
  let rejectedItc = new Decimal(0)
  let pendingItc = new Decimal(0)

  let matchedCount = 0
  let mismatchedCount = 0
  let missingInBooksCount = 0
  let missingIn2bCount = 0

  for (const row of rows) {
    if (row.status === 'matched') matchedCount += 1
    if (row.status === 'mismatched') mismatchedCount += 1
    if (row.status === 'missing_in_books') missingInBooksCount += 1
    if (row.status === 'missing_in_2b') missingIn2bCount += 1

    if (row.bookTotalGstAmount) {
      booksItc = booksItc.plus(row.bookTotalGstAmount)
    }
    const portalAmount = portalItcForRow(row)
    if (row.portalTotalGstAmount) {
      portalItc = portalItc.plus(row.portalTotalGstAmount)
    }

    if (row.status === 'missing_in_2b') continue

    if (row.itcStatus === 'accepted') {
      acceptedItc = acceptedItc.plus(portalAmount)
    } else if (row.itcStatus === 'rejected') {
      rejectedItc = rejectedItc.plus(portalAmount)
    } else if (row.portalTotalGstAmount) {
      pendingItc = pendingItc.plus(portalAmount)
    }
  }

  return {
    matchedCount,
    mismatchedCount,
    missingInBooksCount,
    missingIn2bCount,
    booksItcTotal: booksItc.toFixed(2),
    portalItcTotal: portalItc.toFixed(2),
    acceptedItcTotal: acceptedItc.toFixed(2),
    rejectedItcTotal: rejectedItc.toFixed(2),
    pendingItcTotal: pendingItc.toFixed(2),
    claimableItcTotal: acceptedItc.toFixed(2),
  }
}

export async function reconcileGstr2b(
  deps: {
    bills: PurchaseBillRepository
    parties: PartyRepository
    recon?: GstReconciliationRepository
  },
  input: {
    companyId: string
    companyStateCode: string
    periodStart: string
    periodEnd: string
    portalRows: Array<Gstr2bRow>
  },
): Promise<Gstr2bReconciliationReport> {
  const [bills, partyList, decisions] = await Promise.all([
    deps.bills.listByCompanyId(input.companyId),
    deps.parties.listByCompanyId(input.companyId),
    deps.recon?.listGstr2bItcDecisions(
      input.companyId,
      input.periodStart,
      input.periodEnd,
    ) ?? [],
  ])

  const partyById = new Map(partyList.map((party) => [party.id, party]))
  const decisionByRowKey = new Map(
    decisions.map((decision) => [decision.rowKey, decision.status]),
  )

  const periodBills = bills.filter((bill) =>
    inPeriod(bill.billDate, input.periodStart, input.periodEnd),
  )
  const periodPortalRows = input.portalRows.filter((row) =>
    inPeriod(row.invoiceDate, input.periodStart, input.periodEnd),
  )

  const rows: Array<Gstr2bReconciliationRow> = []
  const matchedPortalKeys = new Set<string>()

  for (const bill of periodBills) {
    const party = partyById.get(bill.supplierId)
    const supplierGstin = party?.gstin ?? null
    const bookSplit = splitPurchaseGst(
      bill.totalGstAmount,
      input.companyStateCode,
      party?.stateCode ?? input.companyStateCode,
    )
    const normalizedBillInvoice = normalizeInvoiceNumber(bill.supplierBillNumber)

    const portalRow = periodPortalRows.find((row) => {
      const sameInvoice =
        normalizeInvoiceNumber(row.supplierInvoiceNumber) === normalizedBillInvoice
      const portalGstin = normalizeGstin(row.supplierGstin)
      const bookGstin = normalizeGstin(supplierGstin)
      if (bookGstin && portalGstin) {
        return sameInvoice && bookGstin === portalGstin
      }
      return sameInvoice
    })

    if (!portalRow) {
      const rowKey = buildGstr2bRowKey({
        supplierGstin,
        supplierInvoiceNumber: bill.supplierBillNumber,
        invoiceDate: bill.billDate,
      })
      rows.push({
        rowKey,
        supplierInvoiceNumber: bill.supplierBillNumber,
        supplierGstin,
        invoiceDate: bill.billDate,
        bookTaxableAmount: bill.taxableAmount,
        bookCgstAmount: bookSplit.cgstAmount,
        bookSgstAmount: bookSplit.sgstAmount,
        bookIgstAmount: bookSplit.igstAmount,
        bookTotalGstAmount: bill.totalGstAmount,
        portalTaxableAmount: null,
        portalCgstAmount: null,
        portalSgstAmount: null,
        portalIgstAmount: null,
        portalTotalGstAmount: null,
        status: 'missing_in_2b',
        itcStatus: decisionByRowKey.get(rowKey) ?? 'pending',
      })
      continue
    }

    const portalKey = buildGstr2bRowKey({
      supplierGstin: portalRow.supplierGstin,
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })
    matchedPortalKeys.add(portalKey)

    const taxableMatch = amountsMatch(bill.taxableAmount, portalRow.taxableAmount)
    const gstMatch = amountsMatch(bill.totalGstAmount, portalRow.totalGstAmount)
    const cgstMatch = amountsMatch(bookSplit.cgstAmount, portalRow.cgstAmount)
    const sgstMatch = amountsMatch(bookSplit.sgstAmount, portalRow.sgstAmount)
    const igstMatch = amountsMatch(bookSplit.igstAmount, portalRow.igstAmount)

    const status: Gstr2bMatchStatus =
      taxableMatch && gstMatch && cgstMatch && sgstMatch && igstMatch
        ? 'matched'
        : 'mismatched'

    const rowKey = portalKey
    rows.push({
      rowKey,
      supplierInvoiceNumber: bill.supplierBillNumber,
      supplierGstin: portalRow.supplierGstin || supplierGstin,
      invoiceDate: portalRow.invoiceDate,
      bookTaxableAmount: bill.taxableAmount,
      bookCgstAmount: bookSplit.cgstAmount,
      bookSgstAmount: bookSplit.sgstAmount,
      bookIgstAmount: bookSplit.igstAmount,
      bookTotalGstAmount: bill.totalGstAmount,
      portalTaxableAmount: portalRow.taxableAmount,
      portalCgstAmount: portalRow.cgstAmount,
      portalSgstAmount: portalRow.sgstAmount,
      portalIgstAmount: portalRow.igstAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status,
      itcStatus: decisionByRowKey.get(rowKey) ?? 'pending',
    })
  }

  for (const portalRow of periodPortalRows) {
    const portalKey = buildGstr2bRowKey({
      supplierGstin: portalRow.supplierGstin,
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })
    if (matchedPortalKeys.has(portalKey)) continue

    const rowKey = portalKey
    rows.push({
      rowKey,
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      supplierGstin: portalRow.supplierGstin,
      invoiceDate: portalRow.invoiceDate,
      bookTaxableAmount: null,
      bookCgstAmount: null,
      bookSgstAmount: null,
      bookIgstAmount: null,
      bookTotalGstAmount: null,
      portalTaxableAmount: portalRow.taxableAmount,
      portalCgstAmount: portalRow.cgstAmount,
      portalSgstAmount: portalRow.sgstAmount,
      portalIgstAmount: portalRow.igstAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status: 'missing_in_books',
      itcStatus: decisionByRowKey.get(rowKey) ?? 'pending',
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

export async function setGstr2bItcDecision(
  deps: { recon: GstReconciliationRepository },
  input: {
    companyId: string
    periodStart: string
    periodEnd: string
    rowKey: string
    status: Gstr2bItcStatus
  },
) {
  return deps.recon.setGstr2bItcDecision({
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    rowKey: input.rowKey,
    status: input.status,
    updatedAt: new Date(),
  })
}
