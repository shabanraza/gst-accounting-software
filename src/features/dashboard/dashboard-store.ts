import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  DailyDashboardSummary,
  DashboardSummaryRepository,
} from '#/features/dashboard/dashboard-summary-service.ts'

function emptySummary(
  companyId: string,
  summaryDate: string,
): DailyDashboardSummary {
  return {
    companyId,
    summaryDate,
    salesTotal: '0.00',
    purchaseTotal: '0.00',
    receivableTotal: '0.00',
    payableTotal: '0.00',
    stockInQuantity: '0',
    stockOutQuantity: '0',
  }
}

export class InMemoryDashboardSummaryRepository
  implements DashboardSummaryRepository
{
  private summaries = new Map<string, DailyDashboardSummary>()

  private key(companyId: string, summaryDate: string) {
    return `${companyId}:${summaryDate}`
  }

  async get(companyId: string, summaryDate: string) {
    return (
      this.summaries.get(this.key(companyId, summaryDate)) ??
      emptySummary(companyId, summaryDate)
    )
  }

  async save(summary: DailyDashboardSummary) {
    this.summaries.set(
      this.key(summary.companyId, summary.summaryDate),
      summary,
    )
    return summary
  }
}

type SummaryRow = typeof schema.dashboardDailySummaries.$inferSelect

function mapRowToSummary(row: SummaryRow): DailyDashboardSummary {
  return {
    companyId: row.companyId,
    summaryDate: row.summaryDate,
    salesTotal: row.salesTotal,
    purchaseTotal: row.purchaseTotal,
    receivableTotal: row.receivableTotal,
    payableTotal: row.payableTotal,
    stockInQuantity: row.stockInQuantity,
    stockOutQuantity: row.stockOutQuantity,
  }
}

export class DrizzleDashboardSummaryRepository
  implements DashboardSummaryRepository
{
  constructor(private readonly database: AppDatabase) {}

  async get(companyId: string, summaryDate: string) {
    const rows = await this.database
      .select()
      .from(schema.dashboardDailySummaries)
      .where(
        and(
          eq(schema.dashboardDailySummaries.companyId, companyId),
          eq(schema.dashboardDailySummaries.summaryDate, summaryDate),
        ),
      )
      .limit(1)

    if (rows.length === 0) {
      return emptySummary(companyId, summaryDate)
    }

    return mapRowToSummary(rows[0])
  }

  async save(summary: DailyDashboardSummary) {
    const now = new Date()
    const [saved] = await this.database
      .insert(schema.dashboardDailySummaries)
      .values({
        companyId: summary.companyId,
        summaryDate: summary.summaryDate,
        salesTotal: summary.salesTotal,
        purchaseTotal: summary.purchaseTotal,
        receivableTotal: summary.receivableTotal,
        payableTotal: summary.payableTotal,
        stockInQuantity: summary.stockInQuantity,
        stockOutQuantity: summary.stockOutQuantity,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.dashboardDailySummaries.companyId,
          schema.dashboardDailySummaries.summaryDate,
        ],
        set: {
          salesTotal: summary.salesTotal,
          purchaseTotal: summary.purchaseTotal,
          receivableTotal: summary.receivableTotal,
          payableTotal: summary.payableTotal,
          stockInQuantity: summary.stockInQuantity,
          stockOutQuantity: summary.stockOutQuantity,
          updatedAt: now,
        },
      })
      .returning()

    return mapRowToSummary(saved)
  }
}

export function createDashboardSummaryRepository(): DashboardSummaryRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryDashboardSummaryRepository()
  }

  return new DrizzleDashboardSummaryRepository(database)
}

export const dashboardSummaryRepository = createDashboardSummaryRepository()
