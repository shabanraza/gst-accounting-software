import { beforeEach, describe, expect, test } from 'vitest'

import { createAccountingRouter } from '#/features/accounting/accounting-router.ts'
import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createPostingTransaction } from '#/features/accounting/posting-transaction.ts'
import { createAuditRouter } from '#/features/audit/audit-router.ts'
import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createExpensesRouter } from '#/features/expenses/expense-router.ts'
import { InMemoryExpenseRepository } from '#/features/expenses/expense-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createOcrDraft } from '#/features/ocr/ocr-draft-service.ts'
import { InMemoryOcrDraftRepository } from '#/features/ocr/ocr-draft-store.ts'
import { createOcrRouter } from '#/features/ocr/ocr-router.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { createPaymentsRouter } from '#/features/payments/payment-router.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { createPurchasesRouter } from '#/features/purchases/purchase-router.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { createReturnsRouter } from '#/features/returns/returns-router.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { PostingRepositories } from '#/features/accounting/posting-transaction.ts'
import type { DocumentAttachmentRepository } from '#/features/documents/document-attachment-service.ts'
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

async function seed() {
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
    audit,
  }
  const financialYears = new InMemoryFinancialYearRepository()
  await createFinancialYear(financialYears, {
    companyId,
    startDate: '2026-04-01',
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
  const supplier = await createParty(repositories.parties, {
    companyId,
    name: 'Test Supplier',
    partyType: 'supplier',
    gstin: '27AABCU9603R1ZN',
    billingAddress: 'Test street, Pune',
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 15,
    receivableAccountId: null,
    payableAccountId: byKey('supplier_payable'),
  })
  const item = await createItem(repositories.items, {
    companyId,
    name: 'Test Service',
    hsnCode: '9983',
    gstRate: '18.00',
    baseUnit: 'nos',
    purchaseRate: '100.00',
    saleRate: '100.00',
    tracksInventory: false,
  })
  const line = {
    itemId: item.id,
    description: 'Test Service',
    quantity: '1',
    unit: 'nos',
    rate: '100.00',
    gstRate: '18.00',
  }

  const transaction = createPostingTransaction(repositories, () => null)
  const router = createTRPCRouter({
    sales: createSalesRouter(repositories.invoices, transaction),
    purchases: createPurchasesRouter(repositories.bills, transaction),
    payments: createPaymentsRouter(transaction),
    returns: createReturnsRouter(
      repositories.posting,
      repositories.stock,
      new InMemoryCreditDebitNoteRepository(),
      repositories.sequences,
      financialYears,
      audit,
    ),
    expenses: createExpensesRouter(
      new InMemoryExpenseRepository(),
      repositories.posting,
      audit,
    ),
    accounting: createAccountingRouter(ledgers, repositories.posting, audit),
    audit: createAuditRouter(audit, {
      listByIds: async () => [
        { id: userId, name: 'Test Owner', email: 'owner@example.com' },
      ],
    }),
  })
  const caller = router.createCaller(context)

  const postInvoice = () =>
    caller.sales.postInvoice({
      companyId,
      companyStateCode: '27',
      customerId: customer.id,
      customerStateCode: '27',
      invoiceNumber: 'INV-0001',
      invoiceDate: '2026-07-11',
      paymentMode: 'credit',
      salesAccountId: byKey('sales'),
      outputGstAccountId: byKey('output_gst'),
      receivableAccountId: byKey('customer_receivable'),
      cashAccountId: byKey('cash'),
      lines: [line],
    })
  const postBill = () =>
    caller.purchases.postBill({
      companyId,
      companyStateCode: '27',
      financialYearStart: '2026-04-01',
      supplierId: supplier.id,
      supplierStateCode: '27',
      supplierBillNumber: 'SUP-0001',
      billDate: '2026-07-10',
      dueDate: '2026-07-25',
      purchaseAccountId: byKey('purchase'),
      inputGstAccountId: byKey('input_gst'),
      payableAccountId: byKey('supplier_payable'),
      stockAccountId: byKey('stock_in_hand'),
      lines: [line],
    })

  return {
    audit,
    ledgers,
    repositories,
    caller,
    byKey,
    customer,
    supplier,
    line,
    postInvoice,
    postBill,
  }
}

describe('document audit trail', () => {
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

  test('records who posted a sales invoice, with its number and amount', async () => {
    const { audit, postInvoice } = await seed()

    const invoice = await postInvoice()

    expect(audit.list()).toEqual([
      expect.objectContaining({
        companyId,
        actorUserId: userId,
        action: 'sales_invoice.posted',
        entityType: 'sales_invoice',
        entityId: invoice.id,
        metadata: { documentNumber: 'INV-0001', amount: '118.00' },
      }),
    ])
  })

  test('records who cancelled a sales invoice', async () => {
    const { audit, caller, postInvoice } = await seed()
    const invoice = await postInvoice()

    await caller.sales.cancelInvoice({ companyId, id: invoice.id })

    expect(audit.list().at(-1)).toEqual(
      expect.objectContaining({
        actorUserId: userId,
        action: 'sales_invoice.cancelled',
        entityId: invoice.id,
        metadata: { documentNumber: 'INV-0001', amount: '118.00' },
      }),
    )
  })

  test('records purchase bills, receipts and supplier payments', async () => {
    const { audit, caller, byKey, postInvoice, postBill } = await seed()
    const invoice = await postInvoice()
    const bill = await postBill()

    await caller.payments.allocateCustomerReceipt({
      companyId,
      invoiceId: invoice.id,
      amount: '50.00',
      receiptDate: '2026-07-15',
      cashAccountId: byKey('cash'),
      receivableAccountId: byKey('customer_receivable'),
    })
    await caller.payments.allocateSupplierPayment({
      companyId,
      purchaseBillId: bill.id,
      amount: '40.00',
      paymentDate: '2026-07-16',
      cashAccountId: byKey('cash'),
      payableAccountId: byKey('supplier_payable'),
    })

    expect(
      audit.list().map(({ action, actorUserId, metadata }) => ({
        action,
        actorUserId,
        metadata,
      })),
    ).toEqual([
      {
        action: 'sales_invoice.posted',
        actorUserId: userId,
        metadata: { documentNumber: 'INV-0001', amount: '118.00' },
      },
      {
        action: 'purchase_bill.posted',
        actorUserId: userId,
        metadata: { documentNumber: 'SUP-0001', amount: '118.00' },
      },
      {
        action: 'receipt.posted',
        actorUserId: userId,
        metadata: { documentNumber: 'INV-0001', amount: '50.00' },
      },
      {
        action: 'payment.posted',
        actorUserId: userId,
        metadata: { documentNumber: 'SUP-0001', amount: '40.00' },
      },
    ])
  })

  test('records sales and purchase returns with their note numbers', async () => {
    const {
      audit,
      caller,
      byKey,
      customer,
      supplier,
      line,
      postInvoice,
      postBill,
    } = await seed()
    const invoice = await postInvoice()
    const bill = await postBill()

    const creditNote = await caller.returns.postSalesReturn({
      companyId,
      companyStateCode: '27',
      customerId: customer.id,
      customerStateCode: '27',
      salesInvoiceId: invoice.id,
      returnDate: '2026-07-12',
      salesAccountId: byKey('sales'),
      outputGstAccountId: byKey('output_gst'),
      receivableAccountId: byKey('customer_receivable'),
      lines: [line],
    })
    const debitNote = await caller.returns.postPurchaseReturn({
      companyId,
      companyStateCode: '27',
      supplierId: supplier.id,
      supplierStateCode: '27',
      purchaseBillId: bill.id,
      returnDate: '2026-07-13',
      purchaseAccountId: byKey('purchase'),
      inputGstAccountId: byKey('input_gst'),
      payableAccountId: byKey('supplier_payable'),
      lines: [line],
    })

    expect(audit.list().slice(-2)).toEqual([
      expect.objectContaining({
        actorUserId: userId,
        action: 'credit_note.posted',
        entityType: 'credit_note',
        entityId: creditNote.id,
        metadata: { documentNumber: creditNote.noteNumber, amount: '118.00' },
      }),
      expect.objectContaining({
        actorUserId: userId,
        action: 'debit_note.posted',
        entityType: 'debit_note',
        entityId: debitNote.id,
        metadata: { documentNumber: debitNote.noteNumber, amount: '118.00' },
      }),
    ])
  })

  test('records expenses and journal vouchers', async () => {
    const { audit, caller, byKey } = await seed()

    const expense = await caller.expenses.post({
      companyId,
      expenseDate: '2026-07-14',
      narration: 'Test office rent',
      amount: '500.00',
      expenseAccountId: byKey('purchase'),
      paymentAccountId: byKey('cash'),
    })
    const entry = await caller.accounting.postLedgerEntry({
      companyId,
      entryDate: '2026-07-14',
      narration: 'Test transfer',
      voucherType: 'contra',
      lines: [
        { ledgerAccountId: byKey('cash'), debit: '200.00', credit: '0.00' },
        { ledgerAccountId: byKey('bank'), debit: '0.00', credit: '200.00' },
      ],
    })

    expect(audit.list()).toEqual([
      expect.objectContaining({
        actorUserId: userId,
        action: 'expense.posted',
        entityType: 'expense',
        entityId: expense.id,
        metadata: { documentNumber: 'Test office rent', amount: '500.00' },
      }),
      expect.objectContaining({
        actorUserId: userId,
        action: 'contra_voucher.posted',
        entityType: 'ledger_entry',
        entityId: entry.id,
        metadata: { documentNumber: 'Test transfer', amount: '200.00' },
      }),
    ])
  })

  test('records who confirmed a scanned bill as a purchase bill', async () => {
    const { audit, ledgers, repositories } = await seed()
    const drafts = new InMemoryOcrDraftRepository()
    const attachments = {
      findById: async () => ({ companyId }),
    } as unknown as DocumentAttachmentRepository
    const accounts = await ledgers.listByCompanyId(companyId)
    const accountOf = (key: string) =>
      accounts.find((account) => account.systemKey === key)!.id
    const draft = await createOcrDraft(drafts, attachments, {
      companyId,
      attachmentId: crypto.randomUUID(),
      fields: {
        supplierName: { value: 'Test Supplier', confidence: 0.9 },
        supplierGstin: { value: '27AABCU9603R1ZN', confidence: 0.9 },
        billNumber: { value: 'SCAN-0001', confidence: 0.9 },
        billDate: { value: '2026-07-11', confidence: 0.9 },
        taxableAmount: { value: '100.00', confidence: 0.9 },
        gstAmount: { value: '18.00', confidence: 0.9 },
        totalAmount: { value: '118.00', confidence: 0.9 },
      },
    })
    const ocr = createTRPCRouter({
      ocr: createOcrRouter(
        drafts,
        attachments,
        ledgers,
        createPostingTransaction(repositories, () => null),
      ),
    }).createCaller(context)

    const confirmed = await ocr.ocr.confirm({
      companyId,
      draftId: draft.id,
      companyStateCode: '27',
      financialYearStart: '2026-04-01',
      purchaseAccountId: accountOf('purchase'),
      inputGstAccountId: accountOf('input_gst'),
      payableAccountId: accountOf('supplier_payable'),
      stockAccountId: accountOf('stock_in_hand'),
    })

    expect(audit.list()).toEqual([
      expect.objectContaining({
        actorUserId: userId,
        action: 'scanned_bill.confirmed',
        entityType: 'purchase_bill',
        entityId: confirmed.postedPurchaseBillId,
        metadata: { documentNumber: 'SCAN-0001', amount: '118.00' },
      }),
    ])
  })

  test('lists events newest first with the name of who did it', async () => {
    const { caller, postInvoice, postBill } = await seed()
    await postInvoice()
    await postBill()

    const events = await caller.audit.list({ companyId })

    expect(
      events.map(({ action, actorName }) => ({ action, actorName })),
    ).toEqual([
      { action: 'purchase_bill.posted', actorName: 'Test Owner' },
      { action: 'sales_invoice.posted', actorName: 'Test Owner' },
    ])
  })
})
