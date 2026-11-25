import { beforeEach, describe, expect, test } from 'vitest'

import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { createSalesAnalysisRouter } from '#/features/reports-analysis/sales-analysis-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { CompanyRole } from '#/features/companies/membership-service.ts'
import type {
  SalesAnalysisPeriod,
  SalesAnalysisRepository,
} from '#/features/reports-analysis/sales-analysis-store.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const testContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
})

function recordingRepository() {
  const periods: Array<SalesAnalysisPeriod> = []
  const repository: SalesAnalysisRepository = {
    async loadPeriod(period) {
      periods.push(period)
      return {
        from: period.from,
        to: period.to,
        items: [{ id: 'item-1', name: 'Pen' }],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1',
            invoiceDate: period.from,
            customerId: 'cust-1',
            customerName: 'Asha Traders',
            status: 'posted',
            totalAmount: '118.00',
            outstandingAmount: '0.00',
            lines: [
              {
                itemId: 'item-1',
                description: 'Pen',
                quantity: '2',
                unit: 'pcs',
                taxableAmount: '100.00',
                gstAmount: '18.00',
              },
            ],
          },
        ],
        saleMovements: [
          {
            referenceId: 'inv-1',
            itemId: 'item-1',
            quantity: '2',
            value: '60.00',
          },
        ],
        creditNotes: [],
        returnMovements: [],
      }
    },
  }
  return { repository, periods }
}

async function callerForRole(role: CompanyRole) {
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()
  await membershipRepository.create({
    id: crypto.randomUUID(),
    companyId,
    userId,
    role,
    createdAt: new Date(),
  })
  const { repository, periods } = recordingRepository()
  const router = createTRPCRouter({
    analysis: createSalesAnalysisRouter(repository),
  })
  return {
    caller: router.createCaller(testContext(userId)).analysis,
    companyId,
    periods,
  }
}

describe('salesAnalysisRouter', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  test('loads the period for the requested company', async () => {
    const { caller, companyId, periods } = await callerForRole('owner')

    const report = await caller.itemSales({
      companyId,
      from: '2026-11-01',
      to: '2026-11-30',
    })

    expect(periods).toEqual([
      { companyId, from: '2026-11-01', to: '2026-11-30' },
    ])
    expect(report.totals.profitAmount).toBe('40.00')
  })

  test('serves party-wise sales and invoice profit', async () => {
    const { caller, companyId } = await callerForRole('accountant')
    const input = { companyId, from: '2026-11-01', to: '2026-11-30' }

    const parties = await caller.partySales(input)
    const invoices = await caller.invoiceProfit(input)

    expect(parties.rows[0]).toMatchObject({ invoiceCount: 1 })
    expect(invoices.rows[0]).toMatchObject({ profitAmount: '40.00' })
  })

  test('needs the view_reports capability', async () => {
    const { caller, companyId } = await callerForRole('billing')

    await expect(
      caller.itemSales({ companyId, from: '2026-11-01', to: '2026-11-30' }),
    ).rejects.toThrow()
  })

  test('rejects a period that ends before it starts', async () => {
    const { caller, companyId } = await callerForRole('owner')

    await expect(
      caller.itemSales({ companyId, from: '2026-11-30', to: '2026-11-01' }),
    ).rejects.toThrow()
  })
})
