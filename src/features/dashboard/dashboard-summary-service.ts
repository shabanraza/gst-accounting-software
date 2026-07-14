import Decimal from 'decimal.js'

export type DailyDashboardSummary = {
  companyId: string
  summaryDate: string
  salesTotal: string
  purchaseTotal: string
  receivableTotal: string
  payableTotal: string
  stockInQuantity: string
  stockOutQuantity: string
}

export interface DashboardSummaryRepository {
  get: (
    companyId: string,
    summaryDate: string,
  ) => Promise<DailyDashboardSummary>
  save: (summary: DailyDashboardSummary) => Promise<DailyDashboardSummary>
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function addMoney(left: string, right: string) {
  return new Decimal(left).plus(right).toFixed(2)
}

function addQuantity(left: string, right: string) {
  return new Decimal(left).plus(right).toFixed(0)
}

export async function recordSalesSummary(
  repository: DashboardSummaryRepository,
  input: {
    companyId: string
    summaryDate: string
    salesAmount: string
    receivableAmount: string
    stockOutQuantity: string
  },
) {
  const current = await repository.get(input.companyId, input.summaryDate)

  return repository.save({
    ...current,
    salesTotal: addMoney(current.salesTotal, input.salesAmount),
    receivableTotal: addMoney(current.receivableTotal, input.receivableAmount),
    stockOutQuantity: addQuantity(
      current.stockOutQuantity,
      input.stockOutQuantity,
    ),
  })
}

export async function recordPurchaseSummary(
  repository: DashboardSummaryRepository,
  input: {
    companyId: string
    summaryDate: string
    purchaseAmount: string
    payableAmount: string
    stockInQuantity: string
  },
) {
  const current = await repository.get(input.companyId, input.summaryDate)

  return repository.save({
    ...current,
    purchaseTotal: addMoney(current.purchaseTotal, input.purchaseAmount),
    payableTotal: addMoney(current.payableTotal, input.payableAmount),
    stockInQuantity: addQuantity(
      current.stockInQuantity,
      input.stockInQuantity,
    ),
  })
}

export async function reverseSalesSummary(
  repository: DashboardSummaryRepository,
  input: {
    companyId: string
    summaryDate: string
    salesAmount: string
    receivableAmount: string
    stockOutQuantity: string
  },
) {
  const current = await repository.get(input.companyId, input.summaryDate)

  return repository.save({
    ...current,
    salesTotal: new Decimal(current.salesTotal)
      .minus(input.salesAmount)
      .toFixed(2),
    receivableTotal: new Decimal(current.receivableTotal)
      .minus(input.receivableAmount)
      .toFixed(2),
    stockOutQuantity: new Decimal(current.stockOutQuantity)
      .minus(input.stockOutQuantity)
      .toFixed(0),
  })
}

export async function getDashboardSummary(
  repository: DashboardSummaryRepository,
  companyId: string,
  summaryDate: string,
) {
  return repository.get(companyId, summaryDate)
}
