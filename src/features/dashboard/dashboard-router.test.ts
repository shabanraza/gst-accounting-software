import { beforeEach, describe, expect, test } from 'vitest'

import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { createDashboardRouter } from '#/features/dashboard/dashboard-router.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { CompanyRole } from '#/features/companies/membership-service.ts'
import type {
  ExpenseRecord,
  ExpenseRepository,
} from '#/features/expenses/expense-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly rows: Array<ExpenseRecord> = []

  async create(expense: ExpenseRecord) {
    this.rows.push(expense)
    return expense
  }

  async listByCompanyId(companyId: string) {
    return this.rows.filter((expense) => expense.companyId === companyId)
  }
}

const testContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
})

const createCaller = (userId: string) => {
  const summaries = new InMemoryDashboardSummaryRepository()
  const router = createTRPCRouter({
    dashboard: createDashboardRouter(summaries, {
      summaries,
      invoices: new InMemorySalesInvoiceRepository(),
      bills: new InMemoryPurchaseBillRepository(),
      parties: new InMemoryPartyRepository(),
      expenses: new InMemoryExpenseRepository(),
      postings: new InMemoryLedgerPostingRepository(),
      ledgers: new InMemoryLedgerAccountRepository(),
      items: new InMemoryItemRepository(),
      stockBalances: new InMemoryStockStore(),
      notes: new InMemoryCreditDebitNoteRepository(),
    }),
  })

  return router.createCaller(testContext(userId))
}

async function snapshotForRole(role: CompanyRole) {
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()

  await membershipRepository.create({
    id: crypto.randomUUID(),
    companyId,
    userId,
    role,
    createdAt: new Date(),
  })

  return createCaller(userId).dashboard.getOwnerSnapshot({
    companyId,
    asOfDate: '2026-07-14',
    companyStateCode: '24',
  })
}

describe('dashboardRouter.getOwnerSnapshot', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  test('a billing member can load the snapshot without report-only sections', async () => {
    const snapshot = await snapshotForRole('billing')

    expect(snapshot.asOfDate).toBe('2026-07-14')
    expect(snapshot.today.salesTotal).toBe('0.00')
    expect(snapshot.balances.receivableTotal).toBe('0.00')
    expect(snapshot.ageing).toBeUndefined()
    expect(snapshot.gstMtd).toBeUndefined()
  })

  test('an inventory member can load the snapshot', async () => {
    const snapshot = await snapshotForRole('inventory')

    expect(snapshot.asOfDate).toBe('2026-07-14')
    expect(snapshot.ageing).toBeUndefined()
  })

  test('a member with view_reports still receives ageing and GST sections', async () => {
    const snapshot = await snapshotForRole('owner')

    expect(snapshot.ageing?.receivables['not-due']).toBe('0.00')
    expect(snapshot.ageing?.payables['not-due']).toBe('0.00')
    expect(snapshot.gstMtd?.periodEnd).toBe('2026-07-14')
  })

  test('every role receives an attention queue array', async () => {
    const billing = await snapshotForRole('billing')
    const owner = await snapshotForRole('owner')

    expect(billing.attention).toEqual([])
    expect(Array.isArray(owner.attention)).toBe(true)
  })
})
