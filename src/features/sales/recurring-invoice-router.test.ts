import { beforeEach, describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createPostingTransaction } from '#/features/accounting/posting-transaction.ts'
import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { InMemoryExpenseRepository } from '#/features/expenses/expense-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyOpeningBalanceRepository } from '#/features/parties/party-opening-balance-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPaymentVoucherRepository } from '#/features/payments/payment-voucher-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { createRecurringInvoicesRouter } from '#/features/sales/recurring-invoice-router.ts'
import { InMemoryRecurringInvoiceRepository } from '#/features/sales/recurring-invoice-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { PostingRepositories } from '#/features/accounting/posting-transaction.ts'
import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const userId = crypto.randomUUID()
const companyId = crypto.randomUUID()

const context: TRPCContext = {
  session: {
    user: { id: userId, email: 'owner@example.com', name: 'Test Owner' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
}

async function seed(today: string) {
  const audit = new InMemoryAuditLogRepository()
  const ledgers = new InMemoryLedgerAccountRepository()
  const repositories: PostingRepositories = {
    invoices: new InMemorySalesInvoiceRepository(),
    bills: new InMemoryPurchaseBillRepository(),
    posting: new InMemoryLedgerPostingRepository(),
    stock: new InMemoryStockStore(),
    items: new InMemoryItemRepository(),
    parties: new InMemoryPartyRepository(),
    dashboard: new InMemoryDashboardSummaryRepository(),
    sequences: new InMemoryDocumentSequenceRepository(),
    paymentVouchers: new InMemoryPaymentVoucherRepository(),
    openingBalances: new InMemoryPartyOpeningBalanceRepository(),
    expenses: new InMemoryExpenseRepository(),
    recurringInvoices: new InMemoryRecurringInvoiceRepository(),
    creditDebitNotes: new InMemoryCreditDebitNoteRepository(),
    audit,
  }
  const financialYears = new InMemoryFinancialYearRepository()
  const year = await createFinancialYear(financialYears, {
    companyId,
    startDate: '2026-04-01',
    isActive: true,
  })
  const accounts = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const byKey = (key: string) =>
    accounts.find((account) => account.systemKey === key)!.id

  const customer = await createParty(repositories.parties, {
    companyId,
    name: 'Test Customer',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    billingAddress: 'Test street, Pune',
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: byKey('customer_receivable'),
    payableAccountId: null,
  })
  const item = await createItem(repositories.items, {
    companyId,
    name: 'Monthly AMC',
    hsnCode: '9987',
    gstRate: '18.00',
    baseUnit: 'nos',
    purchaseRate: '0.00',
    saleRate: '1000.00',
    tracksInventory: false,
  })

  const company = {
    id: companyId,
    stateCode: '27',
    gstin: null,
    addressLine1: '',
    addressLine2: '',
    city: '',
    pincode: '',
  } as unknown as CompanyRecord

  const transaction = createPostingTransaction(repositories, () => null)
  const router = createTRPCRouter({
    sales: createSalesRouter(repositories.invoices, transaction, {
      companies: { listByIds: async () => [company] },
      parties: repositories.parties,
      items: repositories.items,
      getSecret: () => undefined,
      rateLimiter: { take: () => true },
    }),
    recurringInvoices: createRecurringInvoicesRouter({
      transaction,
      recurring: repositories.recurringInvoices,
      companies: { listByIds: async () => [company] },
      ledgers,
      financialYears,
      today: () => today,
    }),
  })
  const caller = router.createCaller(context)

  const invoice = await caller.sales.postInvoice({
    companyId,
    companyStateCode: '27',
    companyGstin: null,
    customerId: customer.id,
    customerStateCode: '27',
    placeOfSupply: '27',
    financialYearId: year.id,
    series: 'INV',
    invoiceDate: '2026-07-05',
    dueDate: '2026-07-20',
    paymentMode: 'credit',
    narration: 'AMC July',
    salesAccountId: byKey('sales'),
    outputGstAccountId: byKey('output_gst'),
    receivableAccountId: byKey('customer_receivable'),
    cashAccountId: byKey('cash'),
    lines: [
      {
        itemId: item.id,
        description: 'Monthly AMC',
        quantity: '1',
        unit: 'nos',
        rate: '1000.00',
        gstRate: '18.00',
      },
    ],
  })

  return { caller, audit, repositories, invoice }
}

describe('recurring invoices router', () => {
  beforeEach(async () => {
    resetMembershipRepositoryForTests()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
  })

  test('repeats an invoice with the next number on its run date', async () => {
    const { caller, audit, repositories, invoice } = await seed('2026-08-05')

    const recurring = await caller.recurringInvoices.create({
      companyId,
      invoiceId: invoice.id,
      frequency: 'monthly',
      startDate: '2026-08-05',
    })
    const { invoice: next, recurring: after } =
      await caller.recurringInvoices.generate({ companyId, id: recurring.id })

    expect(next).toMatchObject({
      invoiceNumber: 'INV-0002',
      invoiceDate: '2026-08-05',
      dueDate: '2026-08-20',
      customerId: invoice.customerId,
      totalAmount: invoice.totalAmount,
      narration: 'AMC July',
    })
    expect(after).toMatchObject({
      nextRunDate: '2026-09-05',
      generatedCount: 1,
      lastInvoiceNumber: 'INV-0002',
    })
    expect(await repositories.posting.listByCompanyId(companyId)).toHaveLength(
      2,
    )
    expect(audit.list().map((event) => event.action)).toEqual([
      'sales_invoice.posted',
      'recurring_invoice.created',
      'sales_invoice.posted',
    ])

    const listed = await caller.recurringInvoices.list({ companyId })
    expect(listed.today).toBe('2026-08-05')
    expect(listed.records).toHaveLength(1)
  })

  test('refuses to post before the run date', async () => {
    const { caller, repositories, invoice } = await seed('2026-08-04')
    const recurring = await caller.recurringInvoices.create({
      companyId,
      invoiceId: invoice.id,
      frequency: 'monthly',
      startDate: '2026-08-05',
    })

    await expect(
      caller.recurringInvoices.generate({ companyId, id: recurring.id }),
    ).rejects.toThrow('The next invoice is not due until 2026-08-05')
    expect(await repositories.invoices.listByCompanyId(companyId)).toHaveLength(
      1,
    )
  })
})
