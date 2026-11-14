import { beforeEach, describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
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
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { createPaymentsRouter } from '#/features/payments/payment-router.ts'
import { InMemoryPaymentVoucherRepository } from '#/features/payments/payment-voucher-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingRepositories } from '#/features/accounting/posting-transaction.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const userId = crypto.randomUUID()
const companyId = crypto.randomUUID()
const context: TRPCContext = {
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
}

let repositories: PostingRepositories
let accounts: Array<LedgerAccountRecord>
let customerId: string
let caller: ReturnType<typeof makeCaller>

const accountOf = (key: string) =>
  accounts.find((account) => account.systemKey === key)!.id

function makeCaller(
  ledgers: InMemoryLedgerAccountRepository,
  financialYears: InMemoryFinancialYearRepository,
) {
  const router = createTRPCRouter({
    payments: createPaymentsRouter({
      transaction: (work) => work(repositories),
      vouchers: repositories.paymentVouchers,
      ledgers,
      financialYears,
    }),
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
  repositories = {
    invoices: new InMemorySalesInvoiceRepository(),
    bills: new InMemoryPurchaseBillRepository(),
    posting: new InMemoryLedgerPostingRepository(),
    stock: new InMemoryStockStore(),
    items: new InMemoryItemRepository(),
    parties: new InMemoryPartyRepository(),
    dashboard: new InMemoryDashboardSummaryRepository(),
    sequences: new InMemoryDocumentSequenceRepository(),
    paymentVouchers: new InMemoryPaymentVoucherRepository(),
    audit: new InMemoryAuditLogRepository(),
  }
  const ledgers = new InMemoryLedgerAccountRepository()
  accounts = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const financialYears = new InMemoryFinancialYearRepository()
  await financialYears.create({
    id: crypto.randomUUID(),
    companyId,
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    isActive: true,
    createdAt: new Date(),
  })
  customerId = (
    await createParty(repositories.parties, {
      companyId,
      name: 'Noor Retailers',
      partyType: 'customer',
      gstin: null,
      stateCode: '27',
      creditLimit: null,
      paymentTermsDays: 30,
      receivableAccountId: accountOf('customer_receivable'),
      payableAccountId: null,
    })
  ).id
  caller = makeCaller(ledgers, financialYears)
})

describe('payments router', () => {
  test('posts a receipt, then lists and fetches it', async () => {
    const invoice = {
      id: crypto.randomUUID(),
      companyId,
      customerId,
      invoiceNumber: 'INV-1',
      status: 'posted',
      paymentStatus: 'Pending',
      totalAmount: '500.00',
      outstandingAmount: '500.00',
      lines: [],
    } as unknown as SalesInvoiceRecord
    await repositories.invoices.create(invoice)

    const posted = await caller.payments.post({
      companyId,
      kind: 'receipt',
      partyId: customerId,
      voucherDate: '2026-06-10',
      mode: 'cheque',
      cashBankAccountId: accountOf('bank'),
      reference: '004512',
      amount: '800.00',
      allocations: [{ documentId: invoice.id, amount: '500.00' }],
    })

    expect(posted).toMatchObject({
      voucherNumber: 'RCT-0001',
      unallocatedAmount: '300.00',
    })

    const list = await caller.payments.list({ companyId, kind: 'receipt' })
    expect(list.map((row) => row.id)).toEqual([posted.id])
    expect(await caller.payments.list({ companyId, kind: 'payment' })).toEqual(
      [],
    )

    const fetched = await caller.payments.getById({ companyId, id: posted.id })
    expect(fetched.allocations).toHaveLength(1)
  })

  test('getById does not return another company voucher', async () => {
    const posted = await caller.payments.post({
      companyId,
      kind: 'receipt',
      partyId: customerId,
      voucherDate: '2026-06-10',
      mode: 'cash',
      cashBankAccountId: accountOf('cash'),
      amount: '100.00',
      allocations: [],
    })

    const otherCompanyId = crypto.randomUUID()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId: otherCompanyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
    await expect(
      caller.payments.getById({ companyId: otherCompanyId, id: posted.id }),
    ).rejects.toThrow('Voucher not found')
  })

  test('rejects a malformed amount', async () => {
    await expect(
      caller.payments.post({
        companyId,
        kind: 'receipt',
        partyId: customerId,
        voucherDate: '2026-06-10',
        mode: 'cash',
        cashBankAccountId: accountOf('cash'),
        amount: '1e3',
        allocations: [],
      }),
    ).rejects.toThrow()
  })
})
