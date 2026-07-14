import { describe, expect, test } from 'vitest'

import {
  getDashboardSummary,
  recordPurchaseSummary,
  recordSalesSummary,
} from '#/features/dashboard/dashboard-summary-service.ts'
import type {
  DailyDashboardSummary,
  DashboardSummaryRepository,
} from '#/features/dashboard/dashboard-summary-service.ts'

class InMemoryDashboardSummaryRepository implements DashboardSummaryRepository {
  private summaries = new Map<string, DailyDashboardSummary>()

  private key(companyId: string, summaryDate: string) {
    return `${companyId}:${summaryDate}`
  }

  async get(companyId: string, summaryDate: string) {
    return (
      this.summaries.get(this.key(companyId, summaryDate)) ?? {
        companyId,
        summaryDate,
        salesTotal: '0.00',
        purchaseTotal: '0.00',
        receivableTotal: '0.00',
        payableTotal: '0.00',
        stockInQuantity: '0',
        stockOutQuantity: '0',
      }
    )
  }

  async save(summary: DailyDashboardSummary) {
    this.summaries.set(
      this.key(summary.companyId, summary.summaryDate),
      summary,
    )
    return summary
  }

  async listBetween(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    const rows: Array<DailyDashboardSummary> = []
    for (const summary of this.summaries.values()) {
      if (
        summary.companyId === companyId &&
        summary.summaryDate >= startDate &&
        summary.summaryDate <= endDate
      ) {
        rows.push(summary)
      }
    }
    return rows.sort((left, right) =>
      left.summaryDate.localeCompare(right.summaryDate),
    )
  }
}

describe('dashboard summary service', () => {
  test('sales invoice updates daily sales summary', async () => {
    const repository = new InMemoryDashboardSummaryRepository()

    await recordSalesSummary(repository, {
      companyId: 'company-1',
      summaryDate: '2026-07-11',
      salesAmount: '2520.00',
      receivableAmount: '2520.00',
      stockOutQuantity: '20',
    })

    const summary = await getDashboardSummary(
      repository,
      'company-1',
      '2026-07-11',
    )

    expect(summary.salesTotal).toBe('2520.00')
    expect(summary.receivableTotal).toBe('2520.00')
    expect(summary.stockOutQuantity).toBe('20')
  })

  test('purchase bill updates payable and stock summary', async () => {
    const repository = new InMemoryDashboardSummaryRepository()

    await recordPurchaseSummary(repository, {
      companyId: 'company-1',
      summaryDate: '2026-07-10',
      purchaseAmount: '8400.00',
      payableAmount: '8400.00',
      stockInQuantity: '100',
    })

    const summary = await getDashboardSummary(
      repository,
      'company-1',
      '2026-07-10',
    )

    expect(summary.purchaseTotal).toBe('8400.00')
    expect(summary.payableTotal).toBe('8400.00')
    expect(summary.stockInQuantity).toBe('100')
  })

  test('dashboard reads summary tables, not raw invoices', async () => {
    const repository = new InMemoryDashboardSummaryRepository()

    await recordSalesSummary(repository, {
      companyId: 'company-1',
      summaryDate: '2026-07-11',
      salesAmount: '1000.00',
      receivableAmount: '1000.00',
      stockOutQuantity: '5',
    })

    await recordSalesSummary(repository, {
      companyId: 'company-1',
      summaryDate: '2026-07-11',
      salesAmount: '500.00',
      receivableAmount: '500.00',
      stockOutQuantity: '2',
    })

    const summary = await getDashboardSummary(
      repository,
      'company-1',
      '2026-07-11',
    )

    expect(summary.salesTotal).toBe('1500.00')
    expect(summary.stockOutQuantity).toBe('7')
    expect(Object.keys(summary)).not.toContain('invoices')
  })
})
