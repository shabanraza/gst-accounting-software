import Decimal from 'decimal.js'

import {
  buildPayablesAgeing,
  buildReceivablesAgeing,
} from '#/features/accounting/ageing-service.ts'
import { buildAttentionQueue } from '#/features/dashboard/attention-queue.ts'
import {
  getDashboardSummary,
  listDashboardSummariesBetween,
} from '#/features/dashboard/dashboard-summary-service.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import { buildGstDocuments } from '#/features/gst/gst-report-documents.ts'

import type {
  AgeingBucketLabel,
  AgeingRow,
} from '#/features/accounting/ageing-service.ts'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { Capability } from '#/features/companies/membership-service.ts'
import type {
  AttentionItem,
  LowStockSignal,
  OverduePartySignal,
} from '#/features/dashboard/attention-queue.ts'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'
import type { ExpenseRepository } from '#/features/expenses/expense-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { StockBalanceRepository } from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

import { localCalendarDate } from '#/lib/calendar-date.ts'

export type DueTodayItem = {
  id: string
  partyName: string
  documentNumber: string
  amount: string
  kind: 'receivable' | 'payable'
}

export type OwnerDashboardSnapshot = {
  asOfDate: string
  today: {
    salesTotal: string
    purchaseTotal: string
    moneyIn: string
    moneyOut: string
    expensesTotal: string
    netCashFlow: string
  }
  balances: {
    cashBankBalance: string
    receivableTotal: string
    payableTotal: string
  }
  trend: Array<{
    date: string
    sales: string
    purchases: string
  }>
  todayExpenses: Array<{
    id: string
    narration: string
    amount: string
  }>
  dueToday: {
    receivables: Array<DueTodayItem>
    payables: Array<DueTodayItem>
  }
  /** Report-grade detail; omitted for callers without the `view_reports` capability. */
  ageing?: {
    receivables: Record<AgeingBucketLabel, string>
    payables: Record<AgeingBucketLabel, string>
  }
  overdue: {
    invoiceCount: number
    billCount: number
  }
  monthCompare: {
    currentLabel: string
    previousLabel: string
    current: {
      salesTotal: string
      purchaseTotal: string
      expensesTotal: string
    }
    previous: {
      salesTotal: string
      purchaseTotal: string
      expensesTotal: string
    }
    change: {
      salesPercent: string
      purchasePercent: string
      expensesPercent: string
    }
  }
  /** Report-grade detail; omitted for callers without the `view_reports` capability. */
  gstMtd?: {
    periodStart: string
    periodEnd: string
    outwardTaxableValue: string
    outputGst: string
    inputGst: string
    netGstPayable: string
  }
  /** Ranked "needs attention" rows, already filtered to what this caller may see. */
  attention: Array<AttentionItem>
}

export type OwnerDashboardOptions = {
  /**
   * When true, the caller receives financial figures (cash, sales, ageing, GST,
   * overdue counts). Defaults to false so a forgotten option cannot leak
   * report-grade data to `view`-only roles such as billing or inventory.
   */
  includeReports?: boolean
  /**
   * The caller's capabilities, used to filter the attention queue. Defaults to
   * none, so a caller that forgets to pass them gets an empty queue rather than
   * rows they may not be entitled to see.
   */
  capabilities?: ReadonlyArray<Capability>
}

export type OwnerDashboardDeps = {
  summaries: DashboardSummaryRepository
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  parties: PartyRepository
  expenses: ExpenseRepository
  postings: LedgerPostingRepository
  ledgers: LedgerAccountRepository
  items: ItemRepository
  stockBalances: StockBalanceRepository
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { localCalendarDate }

export function addCalendarDays(date: string, delta: number) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + delta)
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-')
}

export function monthStart(date: string) {
  const [year, month] = date.split('-')
  return `${year}-${month}-01`
}

export function previousMonthComparablePeriod(asOfDate: string) {
  const [year, month, day] = asOfDate.split('-').map(Number)
  const previousMonthAnchor = new Date(year, month - 2, 1)
  const previousYear = previousMonthAnchor.getFullYear()
  const previousMonth = previousMonthAnchor.getMonth() + 1
  const lastDayOfPreviousMonth = new Date(
    previousYear,
    previousMonth,
    0,
  ).getDate()
  const endDay = Math.min(day, lastDayOfPreviousMonth)

  return {
    start: `${previousYear}-${String(previousMonth).padStart(2, '0')}-01`,
    end: `${previousYear}-${String(previousMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  }
}

function formatCompareLabel(start: string, end: string) {
  const startLabel = new Date(`${start}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  const endLabel = new Date(`${end}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  return `${startLabel} – ${endLabel}`
}

function sumSummariesInRange(
  rows: Array<{
    summaryDate: string
    salesTotal: string
    purchaseTotal: string
  }>,
  start: string,
  end: string,
) {
  let salesTotal = new Decimal(0)
  let purchaseTotal = new Decimal(0)

  for (const row of rows) {
    if (row.summaryDate < start || row.summaryDate > end) continue
    salesTotal = salesTotal.plus(row.salesTotal)
    purchaseTotal = purchaseTotal.plus(row.purchaseTotal)
  }

  return {
    salesTotal: salesTotal.toFixed(2),
    purchaseTotal: purchaseTotal.toFixed(2),
  }
}

function sumExpensesInRange(
  expenses: Array<{ expenseDate: string; amount: string }>,
  start: string,
  end: string,
) {
  return expenses
    .filter(
      (expense) => expense.expenseDate >= start && expense.expenseDate <= end,
    )
    .reduce((total, expense) => total.plus(expense.amount), new Decimal(0))
    .toFixed(2)
}

export function percentChange(current: string, previous: string) {
  const previousValue = new Decimal(previous)
  const currentValue = new Decimal(current)

  if (previousValue.eq(0)) {
    return currentValue.gt(0) ? '100.0' : '0.0'
  }

  return currentValue
    .minus(previousValue)
    .div(previousValue)
    .times(100)
    .toFixed(1)
}

function dateRangeEndingOn(endDate: string, days: number) {
  const dates: Array<string> = []

  for (let index = days - 1; index >= 0; index -= 1) {
    dates.push(addCalendarDays(endDate, -index))
  }

  return {
    startDate: dates[0] ?? endDate,
    endDate,
    dates,
  }
}

async function cashAccountIds(
  ledgers: LedgerAccountRepository,
  companyId: string,
) {
  const accounts = await ledgers.listByCompanyId(companyId)
  return new Set(
    accounts
      .filter(
        (account) =>
          account.systemKey === 'cash' || account.systemKey === 'bank',
      )
      .map((account) => account.id),
  )
}

async function computeCashFlowForDate(
  deps: Pick<OwnerDashboardDeps, 'postings' | 'ledgers'>,
  companyId: string,
  date: string,
) {
  const [entries, accountIds] = await Promise.all([
    deps.postings.listByCompanyId(companyId),
    cashAccountIds(deps.ledgers, companyId),
  ])

  let moneyIn = new Decimal(0)
  let moneyOut = new Decimal(0)

  for (const entry of entries) {
    if (entry.entryDate !== date) continue

    for (const line of entry.lines) {
      if (!accountIds.has(line.ledgerAccountId)) continue
      moneyIn = moneyIn.plus(line.debit)
      moneyOut = moneyOut.plus(line.credit)
    }
  }

  return {
    moneyIn: moneyIn.toFixed(2),
    moneyOut: moneyOut.toFixed(2),
  }
}

async function computeCashBankBalance(
  deps: Pick<OwnerDashboardDeps, 'postings' | 'ledgers'>,
  companyId: string,
) {
  const [entries, accountIds] = await Promise.all([
    deps.postings.listByCompanyId(companyId),
    cashAccountIds(deps.ledgers, companyId),
  ])

  let balance = new Decimal(0)

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!accountIds.has(line.ledgerAccountId)) continue
      balance = balance.plus(line.debit).minus(line.credit)
    }
  }

  return balance.toFixed(2)
}

function sumOutstanding(rows: Array<{ outstandingAmount: string }>) {
  return rows
    .reduce((total, row) => total.plus(row.outstandingAmount), new Decimal(0))
    .toFixed(2)
}

/**
 * Collapses ageing rows into one overdue position per party. Rows that are not
 * yet past due are dropped entirely, so a party whose documents are all within
 * terms produces no signal.
 */
export function rollUpOverdueParties(
  rows: ReadonlyArray<AgeingRow>,
): Array<OverduePartySignal> {
  const byParty = new Map<
    string,
    { signal: OverduePartySignal; outstanding: Decimal }
  >()

  for (const row of rows) {
    if (row.daysPastDue <= 0) continue

    const existing = byParty.get(row.partyId)
    if (!existing) {
      byParty.set(row.partyId, {
        signal: {
          partyId: row.partyId,
          partyName: row.partyName,
          documentCount: 1,
          outstandingAmount: new Decimal(row.outstandingAmount).toFixed(2),
          maxDaysPastDue: row.daysPastDue,
        },
        outstanding: new Decimal(row.outstandingAmount),
      })
      continue
    }

    existing.outstanding = existing.outstanding.plus(row.outstandingAmount)
    existing.signal.documentCount += 1
    existing.signal.outstandingAmount = existing.outstanding.toFixed(2)
    existing.signal.maxDaysPastDue = Math.max(
      existing.signal.maxDaysPastDue,
      row.daysPastDue,
    )
  }

  return [...byParty.values()].map((entry) => entry.signal)
}

/** `''`, `null` and unparseable values all mean "no quantity". */
function toQuantity(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !Number.isFinite(Number(trimmed))) return new Decimal(0)
  return new Decimal(trimmed)
}

/**
 * Items at or below their reorder level, read from the stock-movement-derived
 * balance table. An item with no reorder level carries no threshold and so no
 * signal; emitting one would flood the queue with every item in the catalogue.
 */
export async function buildLowStockSignals(
  deps: Pick<OwnerDashboardDeps, 'items' | 'stockBalances'>,
  companyId: string,
): Promise<Array<LowStockSignal>> {
  const [items, balances] = await Promise.all([
    deps.items.listByCompanyId(companyId),
    deps.stockBalances.listBalancesByCompany(companyId),
  ])

  const quantityByItem = new Map<string, Decimal>()
  for (const balance of balances) {
    quantityByItem.set(
      balance.itemId,
      (quantityByItem.get(balance.itemId) ?? new Decimal(0)).plus(
        toQuantity(balance.quantity),
      ),
    )
  }

  return items.flatMap((item) => {
    if (!item.tracksInventory) return []

    const reorderLevel = toQuantity(item.reorderLevel)
    if (reorderLevel.lte(0)) return []

    const availableQuantity = quantityByItem.get(item.id) ?? new Decimal(0)
    if (availableQuantity.gt(reorderLevel)) return []

    return [
      {
        itemId: item.id,
        itemName: item.name,
        availableQuantity: availableQuantity.toNumber(),
        reorderLevel: reorderLevel.toNumber(),
      },
    ]
  })
}

function emptyFinancialSnapshot(
  asOfDate: string,
  attention: Array<AttentionItem>,
): OwnerDashboardSnapshot {
  const trendRange = dateRangeEndingOn(asOfDate, 7)
  const currentMonthStart = monthStart(asOfDate)
  const previousPeriod = previousMonthComparablePeriod(asOfDate)
  const zeroTotals = {
    salesTotal: '0.00',
    purchaseTotal: '0.00',
    expensesTotal: '0.00',
  }

  return {
    asOfDate,
    today: {
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      moneyIn: '0.00',
      moneyOut: '0.00',
      expensesTotal: '0.00',
      netCashFlow: '0.00',
    },
    balances: {
      cashBankBalance: '0.00',
      receivableTotal: '0.00',
      payableTotal: '0.00',
    },
    trend: trendRange.dates.map((date) => ({
      date,
      sales: '0.00',
      purchases: '0.00',
    })),
    todayExpenses: [],
    dueToday: { receivables: [], payables: [] },
    overdue: { invoiceCount: 0, billCount: 0 },
    monthCompare: {
      currentLabel: formatCompareLabel(currentMonthStart, asOfDate),
      previousLabel: formatCompareLabel(
        previousPeriod.start,
        previousPeriod.end,
      ),
      current: zeroTotals,
      previous: zeroTotals,
      change: {
        salesPercent: '0.00',
        purchasePercent: '0.00',
        expensesPercent: '0.00',
      },
    },
    attention,
  }
}

export async function getOwnerDashboardSnapshot(
  deps: OwnerDashboardDeps,
  companyId: string,
  asOfDate: string,
  companyStateCode: string,
  options: OwnerDashboardOptions = {},
): Promise<OwnerDashboardSnapshot> {
  const includeReports = options.includeReports ?? false
  const capabilities = options.capabilities ?? []

  // Operational callers (billing / inventory) keep the attention queue — low
  // stock and similar — but never receive company financials.
  if (!includeReports) {
    const lowStock = await buildLowStockSignals(deps, companyId)
    return emptyFinancialSnapshot(
      asOfDate,
      buildAttentionQueue({
        asOf: asOfDate,
        capabilities,
        lowStock,
      }),
    )
  }

  const trendRange = dateRangeEndingOn(asOfDate, 7)
  const currentMonthStart = monthStart(asOfDate)
  const previousPeriod = previousMonthComparablePeriod(asOfDate)

  const [
    todaySummary,
    trendRows,
    monthSummaryRows,
    invoices,
    bills,
    parties,
    expenseRows,
    cashFlow,
    cashBankBalance,
    receivablesAgeing,
    payablesAgeing,
    gstDocuments,
    lowStock,
  ] = await Promise.all([
    getDashboardSummary(deps.summaries, companyId, asOfDate),
    listDashboardSummariesBetween(
      deps.summaries,
      companyId,
      trendRange.startDate,
      trendRange.endDate,
    ),
    listDashboardSummariesBetween(
      deps.summaries,
      companyId,
      previousPeriod.start,
      asOfDate,
    ),
    deps.invoices.listByCompanyId(companyId),
    deps.bills.listByCompanyId(companyId),
    deps.parties.listByCompanyId(companyId),
    deps.expenses.listByCompanyId(companyId),
    computeCashFlowForDate(deps, companyId, asOfDate),
    computeCashBankBalance(deps, companyId),
    buildReceivablesAgeing(
      { invoices: deps.invoices, parties: deps.parties },
      companyId,
      new Date(`${asOfDate}T12:00:00`),
    ),
    buildPayablesAgeing(
      { bills: deps.bills, parties: deps.parties },
      companyId,
      new Date(`${asOfDate}T12:00:00`),
    ),
    buildGstDocuments({
      companyId,
      companyStateCode,
      invoices: deps.invoices,
      bills: deps.bills,
      parties: deps.parties,
    }),
    buildLowStockSignals(deps, companyId),
  ])

  const partyNameById = new Map(parties.map((party) => [party.id, party.name]))
  const trendByDate = new Map(trendRows.map((row) => [row.summaryDate, row]))
  const todayExpenses = expenseRows
    .filter((expense) => expense.expenseDate === asOfDate)
    .map((expense) => ({
      id: expense.id,
      narration: expense.narration,
      amount: expense.amount,
    }))
  const expensesTotal = todayExpenses
    .reduce((total, expense) => total.plus(expense.amount), new Decimal(0))
    .toFixed(2)

  const openInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== 'cancelled' &&
      new Decimal(invoice.outstandingAmount).gt(0),
  )
  const openBills = bills.filter((bill) =>
    new Decimal(bill.outstandingAmount).gt(0),
  )

  const dueTodayReceivables = openInvoices
    .filter((invoice) => invoice.dueDate === asOfDate)
    .map((invoice) => ({
      id: invoice.id,
      partyName: partyNameById.get(invoice.customerId) ?? 'Customer',
      documentNumber: invoice.invoiceNumber,
      amount: invoice.outstandingAmount,
      kind: 'receivable' as const,
    }))
  const dueTodayPayables = openBills
    .filter((bill) => bill.dueDate === asOfDate)
    .map((bill) => ({
      id: bill.id,
      partyName: partyNameById.get(bill.supplierId) ?? 'Supplier',
      documentNumber: bill.supplierBillNumber,
      amount: bill.outstandingAmount,
      kind: 'payable' as const,
    }))

  const netCashFlow = new Decimal(cashFlow.moneyIn)
    .minus(cashFlow.moneyOut)
    .toFixed(2)

  const currentMonthTotals = sumSummariesInRange(
    monthSummaryRows,
    currentMonthStart,
    asOfDate,
  )
  const previousMonthTotals = sumSummariesInRange(
    monthSummaryRows,
    previousPeriod.start,
    previousPeriod.end,
  )
  const currentMonthExpenses = sumExpensesInRange(
    expenseRows,
    currentMonthStart,
    asOfDate,
  )
  const previousMonthExpenses = sumExpensesInRange(
    expenseRows,
    previousPeriod.start,
    previousPeriod.end,
  )
  const currentLabel = formatCompareLabel(currentMonthStart, asOfDate)
  const gstMtd = buildGstr3bReport({
    companyId,
    periodStart: currentMonthStart,
    periodEnd: asOfDate,
    documents: gstDocuments,
  })

  /**
   * `filingDueDate` is deliberately omitted: the company carries no
   * filing-frequency field yet, so there is no honest way to derive one, and
   * the ranking module keeps GST at its floor without it.
   */
  const attention = buildAttentionQueue({
    asOf: asOfDate,
    capabilities,
    lowStock,
    overdueReceivables: rollUpOverdueParties(receivablesAgeing.rows),
    overduePayables: rollUpOverdueParties(payablesAgeing.rows),
    gst: {
      netPayableAmount: gstMtd.netGstPayable,
      periodLabel: currentLabel,
    },
  })

  return {
    asOfDate,
    today: {
      salesTotal: todaySummary.salesTotal,
      purchaseTotal: todaySummary.purchaseTotal,
      moneyIn: cashFlow.moneyIn,
      moneyOut: cashFlow.moneyOut,
      expensesTotal,
      netCashFlow,
    },
    balances: {
      cashBankBalance,
      receivableTotal: sumOutstanding(openInvoices),
      payableTotal: sumOutstanding(openBills),
    },
    trend: trendRange.dates.map((date) => {
      const row = trendByDate.get(date)
      return {
        date,
        sales: row?.salesTotal ?? '0.00',
        purchases: row?.purchaseTotal ?? '0.00',
      }
    }),
    todayExpenses,
    dueToday: {
      receivables: dueTodayReceivables,
      payables: dueTodayPayables,
    },
    ageing: {
      receivables: receivablesAgeing.bucketTotals,
      payables: payablesAgeing.bucketTotals,
    },
    overdue: {
      invoiceCount: receivablesAgeing.rows.filter((row) => row.daysPastDue > 0)
        .length,
      billCount: payablesAgeing.rows.filter((row) => row.daysPastDue > 0)
        .length,
    },
    monthCompare: {
      currentLabel,
      previousLabel: formatCompareLabel(
        previousPeriod.start,
        previousPeriod.end,
      ),
      current: {
        salesTotal: currentMonthTotals.salesTotal,
        purchaseTotal: currentMonthTotals.purchaseTotal,
        expensesTotal: currentMonthExpenses,
      },
      previous: {
        salesTotal: previousMonthTotals.salesTotal,
        purchaseTotal: previousMonthTotals.purchaseTotal,
        expensesTotal: previousMonthExpenses,
      },
      change: {
        salesPercent: percentChange(
          currentMonthTotals.salesTotal,
          previousMonthTotals.salesTotal,
        ),
        purchasePercent: percentChange(
          currentMonthTotals.purchaseTotal,
          previousMonthTotals.purchaseTotal,
        ),
        expensesPercent: percentChange(
          currentMonthExpenses,
          previousMonthExpenses,
        ),
      },
    },
    gstMtd: {
      periodStart: gstMtd.periodStart,
      periodEnd: gstMtd.periodEnd,
      outwardTaxableValue: gstMtd.outwardTaxableValue,
      outputGst: gstMtd.outputGst,
      inputGst: gstMtd.inputGst,
      netGstPayable: gstMtd.netGstPayable,
    },
    attention,
  }
}
