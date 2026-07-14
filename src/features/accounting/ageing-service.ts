import Decimal from 'decimal.js'

import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type AgeingBucketLabel = '0-30' | '31-60' | '61-90' | '90+'

export type AgeingRow = {
  partyId: string
  partyName: string
  documentNumber: string
  documentDate: string
  outstandingAmount: string
  daysOutstanding: number
  bucket: AgeingBucketLabel
}

export type AgeingReport = {
  companyId: string
  rows: Array<AgeingRow>
  bucketTotals: Record<AgeingBucketLabel, string>
}

function bucketFor(days: number): AgeingBucketLabel {
  if (days <= 30) return '0-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

function daysBetween(from: string, asOf: Date): number {
  const fromDate = new Date(from)
  const diffMs = asOf.getTime() - fromDate.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function emptyBucketTotals(): Record<AgeingBucketLabel, string> {
  return { '0-30': '0.00', '31-60': '0.00', '61-90': '0.00', '90+': '0.00' }
}

function addBucketTotals(
  totals: Record<AgeingBucketLabel, string>,
  rows: Array<AgeingRow>,
): Record<AgeingBucketLabel, string> {
  const sums: Record<AgeingBucketLabel, Decimal> = {
    '0-30': new Decimal(totals['0-30']),
    '31-60': new Decimal(totals['31-60']),
    '61-90': new Decimal(totals['61-90']),
    '90+': new Decimal(totals['90+']),
  }

  for (const row of rows) {
    sums[row.bucket] = sums[row.bucket].plus(new Decimal(row.outstandingAmount))
  }

  return {
    '0-30': sums['0-30'].toFixed(2),
    '31-60': sums['31-60'].toFixed(2),
    '61-90': sums['61-90'].toFixed(2),
    '90+': sums['90+'].toFixed(2),
  }
}

export async function buildReceivablesAgeing(
  deps: { invoices: SalesInvoiceRepository; parties: PartyRepository },
  companyId: string,
  asOf: Date = new Date(),
): Promise<AgeingReport> {
  const [invoices, parties] = await Promise.all([
    deps.invoices.listByCompanyId(companyId, { includeLines: false }),
    deps.parties.listByCompanyId(companyId),
  ])
  const partyById = new Map(parties.map((party) => [party.id, party]))

  const rows: Array<AgeingRow> = invoices
    .filter((invoice) => new Decimal(invoice.outstandingAmount).gt(0))
    .map((invoice) => {
      const days = daysBetween(invoice.invoiceDate, asOf)
      return {
        partyId: invoice.customerId,
        partyName: partyById.get(invoice.customerId)?.name ?? 'Customer',
        documentNumber: invoice.invoiceNumber,
        documentDate: invoice.invoiceDate,
        outstandingAmount: invoice.outstandingAmount,
        daysOutstanding: days,
        bucket: bucketFor(days),
      }
    })

  return {
    companyId,
    rows,
    bucketTotals: addBucketTotals(emptyBucketTotals(), rows),
  }
}

export async function buildPayablesAgeing(
  deps: { bills: PurchaseBillRepository; parties: PartyRepository },
  companyId: string,
  asOf: Date = new Date(),
): Promise<AgeingReport> {
  const [bills, parties] = await Promise.all([
    deps.bills.listByCompanyId(companyId, { includeLines: false }),
    deps.parties.listByCompanyId(companyId),
  ])
  const partyById = new Map(parties.map((party) => [party.id, party]))

  const rows: Array<AgeingRow> = bills
    .filter((bill) => new Decimal(bill.outstandingAmount).gt(0))
    .map((bill) => {
      const days = daysBetween(bill.billDate, asOf)
      return {
        partyId: bill.supplierId,
        partyName: partyById.get(bill.supplierId)?.name ?? 'Supplier',
        documentNumber: bill.supplierBillNumber,
        documentDate: bill.billDate,
        outstandingAmount: bill.outstandingAmount,
        daysOutstanding: days,
        bucket: bucketFor(days),
      }
    })

  return {
    companyId,
    rows,
    bucketTotals: addBucketTotals(emptyBucketTotals(), rows),
  }
}
