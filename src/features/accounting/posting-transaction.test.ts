import { beforeEach, describe, expect, test } from 'vitest'

import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createPostingTransaction } from '#/features/accounting/posting-transaction.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { createPaymentsRouter } from '#/features/payments/payment-router.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { createPurchasesRouter } from '#/features/purchases/purchase-router.ts'
import {
  DrizzleSalesInvoiceRepository,
  InMemorySalesInvoiceRepository,
} from '#/features/sales/sales-invoice-store.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PostingRepositories,
  PostingTransaction,
} from '#/features/accounting/posting-transaction.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

function inMemoryRepositories(): PostingRepositories {
  return {
    invoices: new InMemorySalesInvoiceRepository(),
    bills: new InMemoryPurchaseBillRepository(),
    posting: new InMemoryLedgerPostingRepository(),
    stock: new InMemoryStockStore(),
    items: new InMemoryItemRepository(),
    parties: new InMemoryPartyRepository(),
    dashboard: new InMemoryDashboardSummaryRepository(),
    sequences: new InMemoryDocumentSequenceRepository(),
  }
}

/** Repositories whose first read throws, so a test can tell which set a flow used. */
function trippedRepositories(marker: string): PostingRepositories {
  const repositories = inMemoryRepositories()
  const trip = () => Promise.reject(new Error(marker))
  repositories.invoices.findById = trip
  repositories.bills.findById = trip
  repositories.bills.findBySupplierBillNumber = trip
  repositories.parties.findById = trip
  return repositories
}

describe('createPostingTransaction', () => {
  test('runs work against the fallback repositories when no database is configured', async () => {
    const fallback = inMemoryRepositories()
    const transaction = createPostingTransaction(fallback, () => null)

    const used = await transaction(async (repositories) => repositories)

    expect(used).toBe(fallback)
  })

  test('commits and closes the per-request database when work succeeds', async () => {
    const events: Array<string> = []
    const tx = {} as AppDatabase
    const transaction = createPostingTransaction(
      inMemoryRepositories(),
      () => ({
        database: {
          transaction: async (work: (tx: AppDatabase) => Promise<unknown>) => {
            events.push('begin')
            const result = await work(tx)
            events.push('commit')
            return result
          },
        } as unknown as AppDatabase,
        close: async () => {
          events.push('close')
        },
      }),
    )

    const used = await transaction(async (repositories) => repositories)

    expect(events).toEqual(['begin', 'commit', 'close'])
    expect(used.invoices).toBeInstanceOf(DrizzleSalesInvoiceRepository)
  })

  test('rolls back and still closes the database when work fails', async () => {
    const events: Array<string> = []
    const transaction = createPostingTransaction(
      inMemoryRepositories(),
      () => ({
        database: {
          transaction: async (work: (tx: AppDatabase) => Promise<unknown>) => {
            events.push('begin')
            try {
              return await work({} as AppDatabase)
            } catch (error) {
              events.push('rollback')
              throw error
            }
          },
        } as unknown as AppDatabase,
        close: async () => {
          events.push('close')
        },
      }),
    )

    await expect(
      transaction(() => Promise.reject(new Error('stock write failed'))),
    ).rejects.toThrow('stock write failed')
    expect(events).toEqual(['begin', 'rollback', 'close'])
  })
})

describe('posting routers', () => {
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  const context: TRPCContext = {
    session: {
      user: { id: userId, email: 'user@example.com', name: 'Test User' },
      session: { id: crypto.randomUUID(), userId },
    },
    request: new Request('http://localhost/api/trpc'),
  }

  let outer: PostingRepositories
  let transactionCalls: number
  let transaction: PostingTransaction
  let scoped: PostingRepositories

  function caller() {
    const router = createTRPCRouter({
      sales: createSalesRouter(outer.invoices, transaction),
      purchases: createPurchasesRouter(outer.bills, transaction),
      payments: createPaymentsRouter(transaction),
    })
    return router.createCaller(context)
  }

  beforeEach(async () => {
    resetMembershipRepositoryForTests()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
    outer = trippedRepositories('used repositories outside the transaction')
    transactionCalls = 0
    scoped = trippedRepositories('used transaction repositories')
    transaction = (work) => {
      transactionCalls += 1
      return work(scoped)
    }
  })

  const line = {
    itemId: crypto.randomUUID(),
    description: 'Cotton Fabric',
    quantity: '1',
    unit: 'meter',
    rate: '100',
    gstRate: '5',
  }

  test('sales postInvoice writes inside one posting transaction', async () => {
    await expect(
      caller().sales.postInvoice({
        companyId,
        companyStateCode: '27',
        customerId: crypto.randomUUID(),
        customerStateCode: '27',
        invoiceNumber: 'INV-1',
        invoiceDate: '2026-04-10',
        paymentMode: 'credit',
        salesAccountId: accountId,
        outputGstAccountId: accountId,
        receivableAccountId: accountId,
        cashAccountId: accountId,
        lines: [line],
      }),
    ).rejects.toThrow('used transaction repositories')
    expect(transactionCalls).toBe(1)
  })

  test('sales postInvoice allocates the invoice number inside the transaction', async () => {
    const financialYearId = crypto.randomUUID()
    const scope = {
      companyId,
      financialYearId,
      voucherType: 'sales',
      series: 'INV',
    }

    await expect(
      caller().sales.postInvoice({
        companyId,
        financialYearId,
        series: 'INV',
        companyStateCode: '27',
        customerId: crypto.randomUUID(),
        customerStateCode: '27',
        invoiceDate: '2026-04-10',
        paymentMode: 'credit',
        salesAccountId: accountId,
        outputGstAccountId: accountId,
        receivableAccountId: accountId,
        cashAccountId: accountId,
        lines: [line],
      }),
    ).rejects.toThrow('used transaction repositories')

    // The number came from the transaction's sequence store, so a database
    // rollback of the failed post also returns the number: no gap.
    expect(await scoped.sequences.allocateNext(scope)).toBe(2)
    expect(await outer.sequences.allocateNext(scope)).toBe(1)
  })

  test('sales cancelInvoice writes inside one posting transaction', async () => {
    await expect(
      caller().sales.cancelInvoice({ companyId, id: crypto.randomUUID() }),
    ).rejects.toThrow('used transaction repositories')
    expect(transactionCalls).toBe(1)
  })

  test('purchases postBill writes inside one posting transaction', async () => {
    await expect(
      caller().purchases.postBill({
        companyId,
        companyStateCode: '27',
        financialYearStart: '2026-04-01',
        supplierId: crypto.randomUUID(),
        supplierStateCode: '27',
        supplierBillNumber: 'SB-1',
        billDate: '2026-04-10',
        dueDate: '2026-05-10',
        purchaseAccountId: accountId,
        inputGstAccountId: accountId,
        payableAccountId: accountId,
        stockAccountId: accountId,
        lines: [line],
      }),
    ).rejects.toThrow('used transaction repositories')
    expect(transactionCalls).toBe(1)
  })

  test('payment allocations write inside one posting transaction', async () => {
    await expect(
      caller().payments.allocateCustomerReceipt({
        companyId,
        invoiceId: crypto.randomUUID(),
        amount: '10',
        receiptDate: '2026-04-10',
        cashAccountId: accountId,
        receivableAccountId: accountId,
      }),
    ).rejects.toThrow('used transaction repositories')
    await expect(
      caller().payments.allocateSupplierPayment({
        companyId,
        purchaseBillId: crypto.randomUUID(),
        amount: '10',
        paymentDate: '2026-04-10',
        cashAccountId: accountId,
        payableAccountId: accountId,
      }),
    ).rejects.toThrow('used transaction repositories')
    expect(transactionCalls).toBe(2)
  })
})
