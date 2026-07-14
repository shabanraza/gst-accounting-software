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
  | 'conflict'

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
  conflictCount: number
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

export class Gstr2bItcDecisionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Gstr2bItcDecisionError'
  }
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

function collectDuplicateKeys<T>(
  items: Array<T>,
  keyFn: (item: T) => string,
): Set<string> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  )
}

export function purchaseAmountsMatch(
  bill: { taxableAmount: string; totalGstAmount: string },
  bookSplit: { cgstAmount: string; sgstAmount: string; igstAmount: string },
  portalRow: Pick<
    Gstr2bRow,
    | 'taxableAmount'
    | 'cgstAmount'
    | 'sgstAmount'
    | 'igstAmount'
    | 'totalGstAmount'
  >,
): boolean {
  if (!amountsMatch(bill.taxableAmount, portalRow.taxableAmount)) {
    return false
  }
  if (!amountsMatch(bill.totalGstAmount, portalRow.totalGstAmount)) {
    return false
  }

  const portalIgst = new Decimal(portalRow.igstAmount)
  if (portalIgst.gt(0)) {
    return amountsMatch(bookSplit.igstAmount, portalRow.igstAmount)
  }

  const bookCgstSgst = new Decimal(bookSplit.cgstAmount).plus(
    bookSplit.sgstAmount,
  )
  const portalCgstSgst = new Decimal(portalRow.cgstAmount).plus(
    portalRow.sgstAmount,
  )
  return amountsMatch(bookCgstSgst.toFixed(2), portalCgstSgst.toFixed(2))
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
  let conflictCount = 0

  for (const row of rows) {
    if (row.status === 'matched') matchedCount += 1
    if (row.status === 'mismatched') mismatchedCount += 1
    if (row.status === 'missing_in_books') missingInBooksCount += 1
    if (row.status === 'missing_in_2b') missingIn2bCount += 1
    if (row.status === 'conflict') conflictCount += 1

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
    conflictCount,
    booksItcTotal: booksItc.toFixed(2),
    portalItcTotal: portalItc.toFixed(2),
    acceptedItcTotal: acceptedItc.toFixed(2),
    rejectedItcTotal: rejectedItc.toFixed(2),
    pendingItcTotal: pendingItc.toFixed(2),
    claimableItcTotal: acceptedItc.toFixed(2),
  }
}

function findMatchingPortalRows(
  supplierGstin: string | null,
  normalizedBillInvoice: string,
  periodPortalRows: Array<Gstr2bRow>,
  conflictedPortalKeys: Set<string>,
) {
  const bookGstin = normalizeGstin(supplierGstin)
  if (!bookGstin) {
    return [] as Array<Gstr2bRow>
  }

  return periodPortalRows.filter((row) => {
    const portalKey = buildGstr2bRowKey({
      supplierGstin: row.supplierGstin,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      invoiceDate: row.invoiceDate,
    })
    if (conflictedPortalKeys.has(portalKey)) {
      return false
    }

    const sameInvoice =
      normalizeInvoiceNumber(row.supplierInvoiceNumber) === normalizedBillInvoice
    const portalGstin = normalizeGstin(row.supplierGstin)
    return sameInvoice && bookGstin === portalGstin
  })
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

  const conflictedBillKeys = collectDuplicateKeys(periodBills, (bill) =>
    buildGstr2bRowKey({
      supplierGstin: partyById.get(bill.supplierId)?.gstin ?? null,
      supplierInvoiceNumber: bill.supplierBillNumber,
      invoiceDate: bill.billDate,
    }),
  )
  const conflictedPortalKeys = collectDuplicateKeys(periodPortalRows, (row) =>
    buildGstr2bRowKey({
      supplierGstin: row.supplierGstin,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      invoiceDate: row.invoiceDate,
    }),
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
    const billKey = buildGstr2bRowKey({
      supplierGstin,
      supplierInvoiceNumber: bill.supplierBillNumber,
      invoiceDate: bill.billDate,
    })

    if (conflictedBillKeys.has(billKey)) {
      rows.push({
        rowKey: billKey,
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
        status: 'conflict',
        itcStatus: decisionByRowKey.get(billKey) ?? 'pending',
      })
      continue
    }

    const portalMatches = findMatchingPortalRows(
      supplierGstin,
      normalizedBillInvoice,
      periodPortalRows,
      conflictedPortalKeys,
    )

    if (portalMatches.length === 0) {
      rows.push({
        rowKey: billKey,
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
        itcStatus: decisionByRowKey.get(billKey) ?? 'pending',
      })
      continue
    }

    if (portalMatches.length > 1) {
      rows.push({
        rowKey: billKey,
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
        status: 'conflict',
        itcStatus: decisionByRowKey.get(billKey) ?? 'pending',
      })
      continue
    }

    const portalRow = portalMatches[0]!
    const portalKey = buildGstr2bRowKey({
      supplierGstin: portalRow.supplierGstin,
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })

    if (conflictedPortalKeys.has(portalKey)) {
      rows.push({
        rowKey: portalKey,
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
        status: 'conflict',
        itcStatus: decisionByRowKey.get(portalKey) ?? 'pending',
      })
      matchedPortalKeys.add(portalKey)
      continue
    }

    matchedPortalKeys.add(portalKey)

    const status: Gstr2bMatchStatus = purchaseAmountsMatch(
      bill,
      bookSplit,
      portalRow,
    )
      ? 'matched'
      : 'mismatched'

    rows.push({
      rowKey: portalKey,
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
      itcStatus: decisionByRowKey.get(portalKey) ?? 'pending',
    })
  }

  for (const portalRow of periodPortalRows) {
    const portalKey = buildGstr2bRowKey({
      supplierGstin: portalRow.supplierGstin,
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      invoiceDate: portalRow.invoiceDate,
    })
    if (matchedPortalKeys.has(portalKey)) continue

    const status: Gstr2bMatchStatus = conflictedPortalKeys.has(portalKey)
      ? 'conflict'
      : 'missing_in_books'

    rows.push({
      rowKey: portalKey,
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
      status,
      itcStatus: decisionByRowKey.get(portalKey) ?? 'pending',
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
  deps: {
    recon: GstReconciliationRepository
    bills: PurchaseBillRepository
    parties: PartyRepository
  },
  input: {
    companyId: string
    companyStateCode: string
    periodStart: string
    periodEnd: string
    rowKey: string
    status: Gstr2bItcStatus
    portalRows: Array<Gstr2bRow>
  },
) {
  if (input.status === 'accepted' || input.status === 'rejected') {
    const report = await reconcileGstr2b(
      { bills: deps.bills, parties: deps.parties, recon: deps.recon },
      {
        companyId: input.companyId,
        companyStateCode: input.companyStateCode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        portalRows: input.portalRows,
      },
    )
    const row = report.rows.find((entry) => entry.rowKey === input.rowKey)
    if (!row || row.status !== 'matched') {
      throw new Gstr2bItcDecisionError(
        'ITC accept/reject is only allowed for matched rows',
      )
    }
  }

  return deps.recon.setGstr2bItcDecision({
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    rowKey: input.rowKey,
    status: input.status,
    updatedAt: new Date(),
  })
}
