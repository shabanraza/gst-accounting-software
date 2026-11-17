import Decimal from 'decimal.js'

import type {
  OpeningBalanceSide,
  PartyOpeningBalanceRepository,
} from '#/features/parties/party-opening-balance-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type AgeingBucketLabel = 'not-due' | '1-30' | '31-60' | '61-90' | '90+'

/** Buckets in escalating order, for anything that renders the whole set. */
export const AGEING_BUCKET_ORDER = [
  'not-due',
  '1-30',
  '31-60',
  '61-90',
  '90+',
] as const satisfies ReadonlyArray<AgeingBucketLabel>

export const AGEING_BUCKET_DISPLAY_LABEL: Record<AgeingBucketLabel, string> = {
  'not-due': 'Not due',
  '1-30': '1-30 days',
  '31-60': '31-60 days',
  '61-90': '61-90 days',
  '90+': '90+ days',
}

export type AgeingRow = {
  partyId: string
  partyName: string
  documentNumber: string
  documentDate: string
  /** Date the document actually falls due; equals `documentDate` for cash/immediate terms. */
  dueDate: string
  outstandingAmount: string
  /** Days since the document was raised. */
  daysOutstanding: number
  /** Days past `dueDate`; 0 while the document is not yet due. Drives `bucket`. */
  daysPastDue: number
  bucket: AgeingBucketLabel
}

export type AgeingReport = {
  companyId: string
  rows: Array<AgeingRow>
  bucketTotals: Record<AgeingBucketLabel, string>
}

function bucketFor(daysPastDue: number): AgeingBucketLabel {
  if (daysPastDue <= 0) return 'not-due'
  if (daysPastDue <= 30) return '1-30'
  if (daysPastDue <= 60) return '31-60'
  if (daysPastDue <= 90) return '61-90'
  return '90+'
}

function daysBetween(from: string, asOf: Date): number {
  const fromDate = new Date(from)
  const diffMs = asOf.getTime() - fromDate.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Cash/immediate documents carry no usable due date, so they age from the day
 * they were raised.
 */
function effectiveDueDate(
  dueDate: string | null | undefined,
  documentDate: string,
): string {
  const candidate = dueDate?.trim()
  if (!candidate || Number.isNaN(new Date(candidate).getTime())) {
    return documentDate
  }
  return candidate
}

function emptyBucketTotals(): Record<AgeingBucketLabel, string> {
  return {
    'not-due': '0.00',
    '1-30': '0.00',
    '31-60': '0.00',
    '61-90': '0.00',
    '90+': '0.00',
  }
}

function addBucketTotals(
  totals: Record<AgeingBucketLabel, string>,
  rows: Array<AgeingRow>,
): Record<AgeingBucketLabel, string> {
  const sums: Record<AgeingBucketLabel, Decimal> = {
    'not-due': new Decimal(totals['not-due']),
    '1-30': new Decimal(totals['1-30']),
    '31-60': new Decimal(totals['31-60']),
    '61-90': new Decimal(totals['61-90']),
    '90+': new Decimal(totals['90+']),
  }

  for (const row of rows) {
    sums[row.bucket] = sums[row.bucket].plus(new Decimal(row.outstandingAmount))
  }

  return {
    'not-due': sums['not-due'].toFixed(2),
    '1-30': sums['1-30'].toFixed(2),
    '31-60': sums['31-60'].toFixed(2),
    '61-90': sums['61-90'].toFixed(2),
    '90+': sums['90+'].toFixed(2),
  }
}

type OpeningBalanceSource = Pick<
  PartyOpeningBalanceRepository,
  'listByCompanyId'
>

/** Unpaid opening balances on one side, aged from their as-of date. */
async function openingBalanceRows(
  source: OpeningBalanceSource | undefined,
  companyId: string,
  side: OpeningBalanceSide,
  partyName: (partyId: string) => string,
  asOf: Date,
): Promise<Array<AgeingRow>> {
  if (!source) return []
  const balances = await source.listByCompanyId(companyId)
  return balances
    .filter(
      (balance) =>
        balance.side === side && new Decimal(balance.outstandingAmount).gt(0),
    )
    .map((balance) => {
      const daysPastDue = daysBetween(balance.asOfDate, asOf)
      return {
        partyId: balance.partyId,
        partyName: partyName(balance.partyId),
        documentNumber: 'Opening balance',
        documentDate: balance.asOfDate,
        dueDate: balance.asOfDate,
        outstandingAmount: balance.outstandingAmount,
        daysOutstanding: daysPastDue,
        daysPastDue,
        bucket: bucketFor(daysPastDue),
      }
    })
}

export async function buildReceivablesAgeing(
  deps: {
    invoices: SalesInvoiceRepository
    parties: PartyRepository
    openingBalances?: OpeningBalanceSource
  },
  companyId: string,
  asOf: Date = new Date(),
): Promise<AgeingReport> {
  const [invoices, parties] = await Promise.all([
    deps.invoices.listByCompanyId(companyId),
    deps.parties.listByCompanyId(companyId),
  ])
  const partyById = new Map(parties.map((party) => [party.id, party]))
  const opening = await openingBalanceRows(
    deps.openingBalances,
    companyId,
    'receivable',
    (partyId) => partyById.get(partyId)?.name ?? 'Customer',
    asOf,
  )

  const rows: Array<AgeingRow> = invoices
    .filter((invoice) => new Decimal(invoice.outstandingAmount).gt(0))
    .map((invoice) => {
      const dueDate = effectiveDueDate(invoice.dueDate, invoice.invoiceDate)
      const daysPastDue = daysBetween(dueDate, asOf)
      return {
        partyId: invoice.customerId,
        partyName: partyById.get(invoice.customerId)?.name ?? 'Customer',
        documentNumber: invoice.invoiceNumber,
        documentDate: invoice.invoiceDate,
        dueDate,
        outstandingAmount: invoice.outstandingAmount,
        daysOutstanding: daysBetween(invoice.invoiceDate, asOf),
        daysPastDue,
        bucket: bucketFor(daysPastDue),
      }
    })
  rows.unshift(...opening)

  return {
    companyId,
    rows,
    bucketTotals: addBucketTotals(emptyBucketTotals(), rows),
  }
}

export async function buildPayablesAgeing(
  deps: {
    bills: PurchaseBillRepository
    parties: PartyRepository
    openingBalances?: OpeningBalanceSource
  },
  companyId: string,
  asOf: Date = new Date(),
): Promise<AgeingReport> {
  const [bills, parties] = await Promise.all([
    deps.bills.listByCompanyId(companyId),
    deps.parties.listByCompanyId(companyId),
  ])
  const partyById = new Map(parties.map((party) => [party.id, party]))
  const opening = await openingBalanceRows(
    deps.openingBalances,
    companyId,
    'payable',
    (partyId) => partyById.get(partyId)?.name ?? 'Supplier',
    asOf,
  )

  const rows: Array<AgeingRow> = bills
    .filter((bill) => new Decimal(bill.outstandingAmount).gt(0))
    .map((bill) => {
      const dueDate = effectiveDueDate(bill.dueDate, bill.billDate)
      const daysPastDue = daysBetween(dueDate, asOf)
      return {
        partyId: bill.supplierId,
        partyName: partyById.get(bill.supplierId)?.name ?? 'Supplier',
        documentNumber: bill.supplierBillNumber,
        documentDate: bill.billDate,
        dueDate,
        outstandingAmount: bill.outstandingAmount,
        daysOutstanding: daysBetween(bill.billDate, asOf),
        daysPastDue,
        bucket: bucketFor(daysPastDue),
      }
    })
  rows.unshift(...opening)

  return {
    companyId,
    rows,
    bucketTotals: addBucketTotals(emptyBucketTotals(), rows),
  }
}
