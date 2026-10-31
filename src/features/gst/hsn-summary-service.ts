import Decimal from 'decimal.js'

import { uqcForUnit } from '#/features/app-shell/data/india-masters.ts'

import type {
  SalesInvoiceLineRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type {
  GstHsnLine,
  GstReportDocument,
} from '#/features/gst/gst-report-types.ts'

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

/** One GSTR-1 Table 12 row: an HSN code at one unit and GST rate. */
export type Gstr1HsnRow = {
  hsnCode: string
  description: string
  uqc: string
  quantity: string
  gstRate: string
  taxableAmount: string
  igstAmount: string
  cgstAmount: string
  sgstAmount: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/** Services (SAC codes start with 99) are reported with UQC `NA` and no quantity. */
export function hsnLineOf(
  line: SalesInvoiceLineRecord,
  item: ItemRecord | undefined,
): GstHsnLine {
  const hsnCode = item?.hsnCode ?? '0000'
  const isService = hsnCode.startsWith('99')
  return {
    hsnCode,
    description: item?.name ?? line.description,
    uqc: isService ? 'NA' : uqcForUnit(line.unit),
    quantity: isService ? '0' : line.quantity,
    gstRate: line.gstRate,
    taxableAmount: line.taxableAmount,
    gstAmount: line.gstAmount,
  }
}

/** Groups invoice HSN lines by HSN code, UQC and rate, splitting tax by supply type. */
export function summarizeHsnByRate(
  documents: Array<GstReportDocument>,
): Array<Gstr1HsnRow> {
  const groups = new Map<
    string,
    {
      line: GstHsnLine
      quantity: Decimal
      taxable: Decimal
      intraGst: Decimal
      interGst: Decimal
    }
  >()

  for (const document of documents) {
    for (const line of document.hsnLines ?? []) {
      const key = `${line.hsnCode}|${line.uqc}|${new Decimal(line.gstRate).toFixed(2)}`
      const group = groups.get(key) ?? {
        line,
        quantity: new Decimal(0),
        taxable: new Decimal(0),
        intraGst: new Decimal(0),
        interGst: new Decimal(0),
      }
      group.quantity = group.quantity.plus(line.quantity)
      group.taxable = group.taxable.plus(line.taxableAmount)
      if (document.supplyType === 'intra_state') {
        group.intraGst = group.intraGst.plus(line.gstAmount)
      } else {
        group.interGst = group.interGst.plus(line.gstAmount)
      }
      groups.set(key, group)
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => ({
      hsnCode: group.line.hsnCode,
      description: group.line.description,
      uqc: group.line.uqc,
      quantity: group.quantity.toFixed(2),
      gstRate: new Decimal(group.line.gstRate).toFixed(2),
      taxableAmount: group.taxable.toFixed(2),
      igstAmount: group.interGst.toFixed(2),
      cgstAmount: group.intraGst.div(2).toFixed(2),
      sgstAmount: group.intraGst.div(2).toFixed(2),
    }))
}

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
  const totalsByHsn = new Map<
    string,
    { taxable: Decimal; gst: Decimal; qty: Decimal }
  >()

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
