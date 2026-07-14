import Decimal from 'decimal.js'

import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'

export type HsnSummaryRow = {
  hsnCode: string
  taxableAmount: string
  gstAmount: string
  quantity: string
}

export type HsnSummaryReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  rows: Array<HsnSummaryRow>
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function buildHsnSummary(
  deps: {
    invoices: SalesInvoiceRepository
    items: ItemRepository
  },
  companyId: string,
  period: { startDate: string; endDate: string },
): Promise<HsnSummaryReport> {
  const [invoices, items] = await Promise.all([
    deps.invoices.listByCompanyId(companyId),
    deps.items.listByCompanyId(companyId),
  ])

  const hsnByItemId = new Map(items.map((item) => [item.id, item.hsnCode]))
  const totalsByHsn = new Map<string, { taxable: Decimal; gst: Decimal; qty: Decimal }>()

  for (const invoice of invoices) {
    if (
      invoice.invoiceDate < period.startDate ||
      invoice.invoiceDate > period.endDate ||
      invoice.status === 'cancelled'
    ) {
      continue
    }

    for (const line of invoice.lines) {
      const hsn = hsnByItemId.get(line.itemId) ?? '0000'
      const existing = totalsByHsn.get(hsn) ?? {
        taxable: new Decimal(0),
        gst: new Decimal(0),
        qty: new Decimal(0),
      }
      existing.taxable = existing.taxable.plus(line.taxableAmount)
      existing.gst = existing.gst.plus(line.gstAmount)
      existing.qty = existing.qty.plus(line.quantity)
      totalsByHsn.set(hsn, existing)
    }
  }

  const rows = [...totalsByHsn.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hsnCode, totals]) => ({
      hsnCode,
      taxableAmount: totals.taxable.toFixed(2),
      gstAmount: totals.gst.toFixed(2),
      quantity: totals.qty.toFixed(3),
    }))

  return {
    companyId,
    periodStart: period.startDate,
    periodEnd: period.endDate,
    rows,
  }
}
