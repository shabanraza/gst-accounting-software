import Decimal from 'decimal.js'

/**
 * Sales analysis and gross profit, built from what was stored at posting time:
 * invoice lines for the sales value, `sale_out` stock movement values for the
 * cost of goods sold (moving average at sale time), and credit notes plus
 * `sales_return_in` movements for returns. Cancelled invoices are left out.
 *
 * An invoice counts when it is dated inside the period; a return counts when
 * it is against such an invoice and dated on or before the period end.
 */

export type SalesAnalysisInvoiceLine = {
  itemId: string
  description: string
  quantity: string
  unit: string
  taxableAmount: string
  gstAmount: string
}

export type SalesAnalysisInvoice = {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  customerName: string
  status: string
  totalAmount: string
  outstandingAmount: string
  lines: Array<SalesAnalysisInvoiceLine>
}

export type SalesAnalysisSaleMovement = {
  /** The sales invoice id. */
  referenceId: string
  itemId: string
  quantity: string
  value: string
}

export type SalesAnalysisReturnMovement = {
  /** The sales return id; one return can move several items. */
  referenceId: string
  itemId: string
  quantity: string
  value: string
  occurredOn: string
  createdAt: Date
}

export type SalesAnalysisCreditNote = {
  id: string
  noteDate: string
  /** The sales invoice the note was raised against. */
  referenceDocumentId: string | null
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  createdAt: Date
}

export type SalesAnalysisData = {
  from: string
  to: string
  invoices: Array<SalesAnalysisInvoice>
  saleMovements: Array<SalesAnalysisSaleMovement>
  creditNotes: Array<SalesAnalysisCreditNote>
  returnMovements: Array<SalesAnalysisReturnMovement>
  items: Array<{ id: string; name: string }>
}

export type ItemSalesRow = {
  itemId: string
  itemName: string
  unit: string
  soldQuantity: string
  returnedQuantity: string
  netQuantity: string
  taxableAmount: string
  gstAmount: string
  costAmount: string
  profitAmount: string
  /** Profit as a percentage of taxable value; null when there are no sales. */
  marginPercent: string | null
}

export type ProfitTotals = {
  taxableAmount: string
  gstAmount: string
  costAmount: string
  profitAmount: string
  marginPercent: string | null
}

export type InvoiceProfitRow = {
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  taxableAmount: string
  returnedAmount: string
  costAmount: string
  profitAmount: string
  marginPercent: string | null
}

export type PartySalesRow = {
  customerId: string
  customerName: string
  invoiceCount: number
  taxableAmount: string
  gstAmount: string
  /** Credit note value (incl. GST) against these invoices. */
  returnedAmount: string
  /** Invoice totals less returns. */
  totalAmount: string
  outstandingAmount: string
}

const ZERO = new Decimal(0)

function money(value: Decimal) {
  return value.toFixed(2, Decimal.ROUND_HALF_UP)
}

function margin(profit: Decimal, taxable: Decimal) {
  if (taxable.isZero()) return null
  return money(profit.div(taxable).mul(100))
}

function add<TKey>(map: Map<TKey, Decimal>, key: TKey, value: Decimal.Value) {
  map.set(key, (map.get(key) ?? ZERO).plus(value))
}

/** Splits `amount` by weight; the last share takes the rounding remainder. */
function allocate(amount: Decimal, weights: Map<string, Decimal>) {
  const shares = new Map<string, Decimal>()
  const total = [...weights.values()].reduce((sum, w) => sum.plus(w), ZERO)
  if (total.isZero()) return shares
  let remaining = amount
  const keys = [...weights.keys()]
  keys.forEach((key, index) => {
    const share =
      index === keys.length - 1
        ? remaining
        : amount
            .mul(weights.get(key) ?? ZERO)
            .div(total)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    shares.set(key, share)
    remaining = remaining.minus(share)
  })
  return shares
}

type ReturnGroup = {
  id: string
  date: string
  createdAt: number
  movements: Array<SalesAnalysisReturnMovement>
}

/**
 * Pairs each credit note with the stock it brought back. A sales return
 * writes its movements and its note in one request, so they share a date and
 * were created moments apart; the closest pair on the same date wins.
 */
function matchReturnsToNotes(
  notes: Array<SalesAnalysisCreditNote>,
  movements: Array<SalesAnalysisReturnMovement>,
) {
  const groups = new Map<string, ReturnGroup>()
  for (const movement of movements) {
    const group = groups.get(movement.referenceId) ?? {
      id: movement.referenceId,
      date: movement.occurredOn,
      createdAt: movement.createdAt.getTime(),
      movements: [],
    }
    group.createdAt = Math.min(group.createdAt, movement.createdAt.getTime())
    group.movements.push(movement)
    groups.set(movement.referenceId, group)
  }

  const pairs: Array<{ note: SalesAnalysisCreditNote; group: ReturnGroup }> = []
  for (const note of notes) {
    for (const group of groups.values()) {
      if (group.date === note.noteDate) pairs.push({ note, group })
    }
  }
  pairs.sort(
    (a, b) =>
      Math.abs(a.note.createdAt.getTime() - a.group.createdAt) -
        Math.abs(b.note.createdAt.getTime() - b.group.createdAt) ||
      a.note.id.localeCompare(b.note.id) ||
      a.group.id.localeCompare(b.group.id),
  )

  const byNote = new Map<string, ReturnGroup>()
  const usedGroups = new Set<string>()
  for (const { note, group } of pairs) {
    if (byNote.has(note.id) || usedGroups.has(group.id)) continue
    byNote.set(note.id, group)
    usedGroups.add(group.id)
  }
  return byNote
}

type InvoiceAnalysis = {
  invoice: SalesAnalysisInvoice
  taxable: Decimal
  gst: Decimal
  cost: Decimal
  returnedTaxable: Decimal
  returnedTotal: Decimal
  /** Per item, net of returns. */
  itemTaxable: Map<string, Decimal>
  itemGst: Map<string, Decimal>
  itemCost: Map<string, Decimal>
  itemSoldQty: Map<string, Decimal>
  itemReturnedQty: Map<string, Decimal>
}

function analyseInvoices(data: SalesAnalysisData) {
  const invoices = data.invoices.filter(
    (invoice) =>
      invoice.status !== 'cancelled' &&
      invoice.invoiceDate >= data.from &&
      invoice.invoiceDate <= data.to,
  )
  const notes = data.creditNotes.filter((note) => note.noteDate <= data.to)
  const groupByNote = matchReturnsToNotes(
    notes,
    data.returnMovements.filter((movement) => movement.occurredOn <= data.to),
  )

  const notesByInvoice = new Map<string, Array<SalesAnalysisCreditNote>>()
  for (const note of notes) {
    if (!note.referenceDocumentId) continue
    const list = notesByInvoice.get(note.referenceDocumentId) ?? []
    list.push(note)
    notesByInvoice.set(note.referenceDocumentId, list)
  }

  const movementsByInvoice = new Map<string, Array<SalesAnalysisSaleMovement>>()
  for (const movement of data.saleMovements) {
    const list = movementsByInvoice.get(movement.referenceId) ?? []
    list.push(movement)
    movementsByInvoice.set(movement.referenceId, list)
  }

  return invoices.map((invoice): InvoiceAnalysis => {
    const itemTaxable = new Map<string, Decimal>()
    const itemGst = new Map<string, Decimal>()
    const itemCost = new Map<string, Decimal>()
    const itemSoldQty = new Map<string, Decimal>()
    const itemReturnedQty = new Map<string, Decimal>()

    for (const line of invoice.lines) {
      add(itemTaxable, line.itemId, line.taxableAmount)
      add(itemGst, line.itemId, line.gstAmount)
      add(itemSoldQty, line.itemId, line.quantity)
    }
    const grossTaxable = new Map(itemTaxable)
    const taxable = [...grossTaxable.values()].reduce(
      (sum, v) => sum.plus(v),
      ZERO,
    )
    let gst = [...itemGst.values()].reduce((sum, v) => sum.plus(v), ZERO)
    let cost = ZERO
    for (const movement of movementsByInvoice.get(invoice.id) ?? []) {
      add(itemCost, movement.itemId, movement.value)
      cost = cost.plus(movement.value)
    }

    let returnedTaxable = ZERO
    let returnedTotal = ZERO
    for (const note of notesByInvoice.get(invoice.id) ?? []) {
      const noteTaxable = new Decimal(note.taxableAmount)
      const noteGst = new Decimal(note.totalGstAmount)
      returnedTaxable = returnedTaxable.plus(noteTaxable)
      returnedTotal = returnedTotal.plus(note.totalAmount)
      gst = gst.minus(noteGst)

      // Spread the note over the items that came back (at the invoice's unit
      // value), or over the whole invoice when no stock came back.
      const weights = new Map<string, Decimal>()
      for (const movement of groupByNote.get(note.id)?.movements ?? []) {
        add(itemReturnedQty, movement.itemId, movement.quantity)
        add(itemCost, movement.itemId, new Decimal(movement.value).neg())
        cost = cost.minus(movement.value)
        const soldQty = itemSoldQty.get(movement.itemId)
        const soldTaxable = grossTaxable.get(movement.itemId)
        if (soldQty && soldTaxable && !soldQty.isZero()) {
          add(
            weights,
            movement.itemId,
            soldTaxable.div(soldQty).mul(movement.quantity),
          )
        }
      }
      const spread = weights.size > 0 ? weights : grossTaxable
      for (const [itemId, share] of allocate(noteTaxable, spread)) {
        add(itemTaxable, itemId, share.neg())
      }
      for (const [itemId, share] of allocate(noteGst, spread)) {
        add(itemGst, itemId, share.neg())
      }
    }

    return {
      invoice,
      taxable: taxable.minus(returnedTaxable),
      gst,
      cost,
      returnedTaxable,
      returnedTotal,
      itemTaxable,
      itemGst,
      itemCost,
      itemSoldQty,
      itemReturnedQty,
    }
  })
}

function profitTotals(
  rows: Array<{ taxable: Decimal; gst: Decimal; cost: Decimal }>,
): ProfitTotals {
  const taxable = rows.reduce((sum, row) => sum.plus(row.taxable), ZERO)
  const gst = rows.reduce((sum, row) => sum.plus(row.gst), ZERO)
  const cost = rows.reduce((sum, row) => sum.plus(row.cost), ZERO)
  const profit = taxable.minus(cost)
  return {
    taxableAmount: money(taxable),
    gstAmount: money(gst),
    costAmount: money(cost),
    profitAmount: money(profit),
    marginPercent: margin(profit, taxable),
  }
}

export function buildItemSales(data: SalesAnalysisData) {
  const names = new Map(data.items.map((item) => [item.id, item.name]))
  const rows = new Map<
    string,
    {
      itemName: string
      unit: string
      sold: Decimal
      returned: Decimal
      taxable: Decimal
      gst: Decimal
      cost: Decimal
    }
  >()

  for (const analysis of analyseInvoices(data)) {
    for (const line of analysis.invoice.lines) {
      if (!rows.has(line.itemId)) {
        rows.set(line.itemId, {
          itemName: names.get(line.itemId) ?? line.description,
          unit: line.unit,
          sold: ZERO,
          returned: ZERO,
          taxable: ZERO,
          gst: ZERO,
          cost: ZERO,
        })
      }
    }
    for (const [itemId, sold] of analysis.itemSoldQty) {
      const row = rows.get(itemId)
      if (!row) continue
      row.sold = row.sold.plus(sold)
      row.returned = row.returned.plus(
        analysis.itemReturnedQty.get(itemId) ?? ZERO,
      )
      row.taxable = row.taxable.plus(analysis.itemTaxable.get(itemId) ?? ZERO)
      row.gst = row.gst.plus(analysis.itemGst.get(itemId) ?? ZERO)
      row.cost = row.cost.plus(analysis.itemCost.get(itemId) ?? ZERO)
    }
  }

  const values = [...rows.values()]
  return {
    rows: [...rows.entries()].map(([itemId, row]): ItemSalesRow => ({
      itemId,
      itemName: row.itemName,
      unit: row.unit,
      soldQuantity: row.sold.toString(),
      returnedQuantity: row.returned.toString(),
      netQuantity: row.sold.minus(row.returned).toString(),
      taxableAmount: money(row.taxable),
      gstAmount: money(row.gst),
      costAmount: money(row.cost),
      profitAmount: money(row.taxable.minus(row.cost)),
      marginPercent: margin(row.taxable.minus(row.cost), row.taxable),
    })),
    totals: profitTotals(values),
  }
}

export function buildInvoiceProfit(data: SalesAnalysisData) {
  const analyses = analyseInvoices(data)
  return {
    rows: analyses.map((analysis): InvoiceProfitRow => ({
      invoiceId: analysis.invoice.id,
      invoiceNumber: analysis.invoice.invoiceNumber,
      invoiceDate: analysis.invoice.invoiceDate,
      customerName: analysis.invoice.customerName,
      taxableAmount: money(analysis.taxable),
      returnedAmount: money(analysis.returnedTaxable),
      costAmount: money(analysis.cost),
      profitAmount: money(analysis.taxable.minus(analysis.cost)),
      marginPercent: margin(
        analysis.taxable.minus(analysis.cost),
        analysis.taxable,
      ),
    })),
    totals: {
      ...profitTotals(analyses),
      returnedAmount: money(
        analyses.reduce((sum, a) => sum.plus(a.returnedTaxable), ZERO),
      ),
    },
  }
}

export function buildPartySales(data: SalesAnalysisData) {
  const rows = new Map<
    string,
    {
      customerName: string
      count: number
      taxable: Decimal
      gst: Decimal
      returned: Decimal
      total: Decimal
      outstanding: Decimal
    }
  >()

  for (const analysis of analyseInvoices(data)) {
    const { invoice } = analysis
    const row = rows.get(invoice.customerId) ?? {
      customerName: invoice.customerName,
      count: 0,
      taxable: ZERO,
      gst: ZERO,
      returned: ZERO,
      total: ZERO,
      outstanding: ZERO,
    }
    row.count += 1
    row.taxable = row.taxable.plus(analysis.taxable)
    row.gst = row.gst.plus(analysis.gst)
    row.returned = row.returned.plus(analysis.returnedTotal)
    row.total = row.total
      .plus(invoice.totalAmount)
      .minus(analysis.returnedTotal)
    row.outstanding = row.outstanding.plus(invoice.outstandingAmount)
    rows.set(invoice.customerId, row)
  }

  const values = [...rows.values()]
  const sum = (pick: (row: (typeof values)[number]) => Decimal) =>
    money(values.reduce((total, row) => total.plus(pick(row)), ZERO))
  return {
    rows: [...rows.entries()].map(([customerId, row]): PartySalesRow => ({
      customerId,
      customerName: row.customerName,
      invoiceCount: row.count,
      taxableAmount: money(row.taxable),
      gstAmount: money(row.gst),
      returnedAmount: money(row.returned),
      totalAmount: money(row.total),
      outstandingAmount: money(row.outstanding),
    })),
    totals: {
      invoiceCount: values.reduce((total, row) => total + row.count, 0),
      taxableAmount: sum((row) => row.taxable),
      gstAmount: sum((row) => row.gst),
      returnedAmount: sum((row) => row.returned),
      totalAmount: sum((row) => row.total),
      outstandingAmount: sum((row) => row.outstanding),
    },
  }
}
