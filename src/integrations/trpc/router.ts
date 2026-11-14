import { createAssistantRouter } from '#/features/assistant/assistant-router.ts'
import { assistantUsageRepository } from '#/features/assistant/assistant-usage-store.ts'
import { getWorkersAi } from '#/features/assistant/workers-ai-binding.ts'
import { createAuditRouter } from '#/features/audit/audit-router.ts'
import { createBankingRouter } from '#/features/banking/banking-router.ts'
import { bankReconciliationRepository } from '#/features/banking/bank-reconciliation-store.ts'
import { auditLogRepository } from '#/features/audit/audit-store.ts'
import { createAccountingRouter } from '#/features/accounting/accounting-router.ts'
import { ledgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { ledgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createPostingTransaction } from '#/features/accounting/posting-transaction.ts'
import { createCompaniesRouter } from '#/features/companies/company-router.ts'
import { companyRepository } from '#/features/companies/company-store.ts'
import { createFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { createMembershipRepository } from '#/features/companies/membership-store.ts'
import { createDashboardRouter } from '#/features/dashboard/dashboard-router.ts'
import { dashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { createDocumentsRouter } from '#/features/documents/documents-router.ts'
import { documentAttachmentRepository } from '#/features/documents/document-attachment-store.ts'
import { documentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createFixedWindowRateLimiter } from '#/features/documents/public-rate-limit.ts'
import { createExpensesRouter } from '#/features/expenses/expense-router.ts'
import { expenseRepository } from '#/features/expenses/expense-store.ts'
import { createImportsRouter } from '#/features/imports/imports-router.ts'
import { godownRepository } from '#/features/inventory/godown-store.ts'
import { createInventoryRouter } from '#/features/inventory/inventory-router.ts'
import {
  itemRepository,
  stockStore,
} from '#/features/inventory/inventory-store.ts'
import { priceListRepository } from '#/features/inventory/price-list-store.ts'
import { createMarketingRouter } from '#/features/marketing/marketing-router.ts'
import { submissionRepository } from '#/features/marketing/submission-store.ts'
import { createOcrRouter } from '#/features/ocr/ocr-router.ts'
import { ocrDraftRepository } from '#/features/ocr/ocr-draft-store.ts'
import { createPartiesRouter } from '#/features/parties/party-router.ts'
import { partyRepository } from '#/features/parties/party-store.ts'
import { createPaymentsRouter } from '#/features/payments/payment-router.ts'
import { paymentVoucherRepository } from '#/features/payments/payment-voucher-store.ts'
import { createPurchaseOrdersRouter } from '#/features/purchases/purchase-orders-router.ts'
import { purchaseOrderRepository } from '#/features/purchases/purchase-order-store.ts'
import { createGrnRouter } from '#/features/purchases/grn-router.ts'
import { grnRepository } from '#/features/purchases/grn-store.ts'
import { createPurchasesRouter } from '#/features/purchases/purchase-router.ts'
import { purchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { createReportsRouter } from '#/features/gst/reports-router.ts'
import { createSalesAnalysisRouter } from '#/features/reports-analysis/sales-analysis-router.ts'
import { createSalesAnalysisRepository } from '#/features/reports-analysis/sales-analysis-store.ts'
import { creditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { createReturnsRouter } from '#/features/returns/returns-router.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { createTeamRouter } from '#/features/team/team-router.ts'
import { invitationRepository } from '#/features/team/invitation-store.ts'
import { userDirectory } from '#/features/team/user-directory.ts'
import { createSalesDocumentsRouter } from '#/features/sales-documents/sales-documents-router.ts'
import { salesDocumentRepository } from '#/features/sales-documents/sales-document-store.ts'
import { salesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createSupportRouter } from '#/features/support/support-router.ts'
import { preferenceStore } from '#/features/product-updates/preference-store.ts'
import { createPreferencesRouter } from '#/features/product-updates/preferences-router.ts'
import { createProductUpdatesService } from '#/features/product-updates/product-updates-service.ts'
import { createResendAudience } from '#/features/product-updates/resend-audience.ts'
import { sendEmail } from '#/lib/email.ts'

import { createTRPCRouter, publicProcedure } from './init'

const financialYearRepository = createFinancialYearRepository()
const membershipRepository = createMembershipRepository()
const postingTransaction = createPostingTransaction({
  invoices: salesInvoiceRepository,
  bills: purchaseBillRepository,
  posting: ledgerPostingRepository,
  stock: stockStore,
  items: itemRepository,
  parties: partyRepository,
  dashboard: dashboardSummaryRepository,
  sequences: documentSequenceRepository,
  paymentVouchers: paymentVoucherRepository,
  audit: auditLogRepository,
})

export const trpcRouter = createTRPCRouter({
  health: {
    ping: publicProcedure.query(() => ({ ok: true })),
  },
  audit: createAuditRouter(auditLogRepository, userDirectory),
  marketing: createMarketingRouter(submissionRepository),
  companies: createCompaniesRouter({
    companies: companyRepository,
    ledgers: ledgerAccountRepository,
    financialYears: financialYearRepository,
    memberships: membershipRepository,
    audit: auditLogRepository,
    godowns: godownRepository,
  }),
  accounting: createAccountingRouter(
    ledgerAccountRepository,
    ledgerPostingRepository,
    auditLogRepository,
  ),
  parties: createPartiesRouter(partyRepository, auditLogRepository),
  inventory: createInventoryRouter(
    itemRepository,
    stockStore,
    godownRepository,
    priceListRepository,
    ledgerAccountRepository,
    postingTransaction,
    financialYearRepository,
    auditLogRepository,
  ),
  purchases: createPurchasesRouter(purchaseBillRepository, postingTransaction),
  purchaseOrders: createPurchaseOrdersRouter(purchaseOrderRepository),
  purchaseGrns: createGrnRouter(
    grnRepository,
    purchaseOrderRepository,
    stockStore,
    itemRepository,
  ),
  sales: createSalesRouter(salesInvoiceRepository, postingTransaction, {
    companies: companyRepository,
    parties: partyRepository,
    items: itemRepository,
    getSecret: () => process.env.INVOICE_LINK_SECRET,
    rateLimiter: createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 }),
  }),
  payments: createPaymentsRouter({
    transaction: postingTransaction,
    vouchers: paymentVoucherRepository,
    ledgers: ledgerAccountRepository,
    financialYears: financialYearRepository,
  }),
  banking: createBankingRouter(
    bankReconciliationRepository,
    ledgerPostingRepository,
    ledgerAccountRepository,
  ),
  returns: createReturnsRouter(
    ledgerPostingRepository,
    stockStore,
    creditDebitNoteRepository,
    documentSequenceRepository,
    financialYearRepository,
    auditLogRepository,
  ),
  expenses: createExpensesRouter(
    expenseRepository,
    ledgerPostingRepository,
    auditLogRepository,
  ),
  reports: createReportsRouter({
    invoices: salesInvoiceRepository,
    bills: purchaseBillRepository,
    parties: partyRepository,
    ledgers: ledgerAccountRepository,
    postings: ledgerPostingRepository,
    notes: creditDebitNoteRepository,
    stockMovements: stockStore,
    stockBalances: stockStore,
    items: itemRepository,
  }),
  analysis: createSalesAnalysisRouter(
    createSalesAnalysisRepository({
      invoices: salesInvoiceRepository,
      stock: stockStore,
      notes: creditDebitNoteRepository,
      items: itemRepository,
      parties: partyRepository,
    }),
  ),
  assistant: createAssistantRouter({
    parties: partyRepository,
    invoices: salesInvoiceRepository,
    bills: purchaseBillRepository,
    notes: creditDebitNoteRepository,
    items: itemRepository,
    stockBalances: stockStore,
    ledgers: ledgerAccountRepository,
    postings: ledgerPostingRepository,
    usage: assistantUsageRepository,
    getAi: getWorkersAi,
  }),
  dashboard: createDashboardRouter(dashboardSummaryRepository, {
    summaries: dashboardSummaryRepository,
    invoices: salesInvoiceRepository,
    bills: purchaseBillRepository,
    parties: partyRepository,
    expenses: expenseRepository,
    postings: ledgerPostingRepository,
    ledgers: ledgerAccountRepository,
    items: itemRepository,
    stockBalances: stockStore,
    notes: creditDebitNoteRepository,
  }),
  documents: createDocumentsRouter(
    documentSequenceRepository,
    documentAttachmentRepository,
    purchaseBillRepository,
  ),
  imports: createImportsRouter(
    partyRepository,
    itemRepository,
    ledgerAccountRepository,
    ledgerPostingRepository,
    postingTransaction,
    auditLogRepository,
  ),
  salesDocuments: createSalesDocumentsRouter(
    salesDocumentRepository,
    itemRepository,
    documentSequenceRepository,
  ),
  ocr: createOcrRouter(
    ocrDraftRepository,
    documentAttachmentRepository,
    ledgerAccountRepository,
    postingTransaction,
  ),
  team: createTeamRouter({
    memberships: membershipRepository,
    invitations: invitationRepository,
    companies: companyRepository,
    users: userDirectory,
    audit: auditLogRepository,
  }),
  support: createSupportRouter({ send: sendEmail }),
  preferences: createPreferencesRouter(
    createProductUpdatesService({
      store: preferenceStore,
      audience: createResendAudience({
        apiKey: process.env.RESEND_API_KEY,
        audienceId: process.env.RESEND_AUDIENCE_ID,
      }),
    }),
  ),
})
export type TRPCRouter = typeof trpcRouter
