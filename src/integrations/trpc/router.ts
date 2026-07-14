import { createAuditRouter } from '#/features/audit/audit-router.ts'
import { auditLogRepository } from '#/features/audit/audit-store.ts'
import { createAccountingRouter } from '#/features/accounting/accounting-router.ts'
import { ledgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { ledgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createCompaniesRouter } from '#/features/companies/company-router.ts'
import { companyRepository } from '#/features/companies/company-store.ts'
import { createFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { createMembershipRepository } from '#/features/companies/membership-store.ts'
import { createDashboardRouter } from '#/features/dashboard/dashboard-router.ts'
import { dashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { createDocumentsRouter } from '#/features/documents/documents-router.ts'
import { documentAttachmentRepository } from '#/features/documents/document-attachment-store.ts'
import { documentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
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
import { createOcrRouter } from '#/features/ocr/ocr-router.ts'
import { ocrDraftRepository } from '#/features/ocr/ocr-draft-store.ts'
import { createPartiesRouter } from '#/features/parties/party-router.ts'
import { partyRepository } from '#/features/parties/party-store.ts'
import { createPaymentsRouter } from '#/features/payments/payment-router.ts'
import { createPurchaseOrdersRouter } from '#/features/purchases/purchase-orders-router.ts'
import { purchaseOrderRepository } from '#/features/purchases/purchase-order-store.ts'
import { createGrnRouter } from '#/features/purchases/grn-router.ts'
import { grnRepository } from '#/features/purchases/grn-store.ts'
import { createPurchasesRouter } from '#/features/purchases/purchase-router.ts'
import { purchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { createReportsRouter } from '#/features/gst/reports-router.ts'
import { creditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { createReturnsRouter } from '#/features/returns/returns-router.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { createTeamRouter } from '#/features/team/team-router.ts'
import { invitationRepository } from '#/features/team/invitation-store.ts'
import { userDirectory } from '#/features/team/user-directory.ts'
import { createSalesDocumentsRouter } from '#/features/sales-documents/sales-documents-router.ts'
import { salesDocumentRepository } from '#/features/sales-documents/sales-document-store.ts'
import { salesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import { createTRPCRouter, publicProcedure } from './init'

const financialYearRepository = createFinancialYearRepository()
const membershipRepository = createMembershipRepository()

export const trpcRouter = createTRPCRouter({
  health: {
    ping: publicProcedure.query(() => ({ ok: true })),
  },
  audit: createAuditRouter(auditLogRepository),
  companies: createCompaniesRouter({
    companies: companyRepository,
    ledgers: ledgerAccountRepository,
    financialYears: financialYearRepository,
    memberships: membershipRepository,
    audit: auditLogRepository,
    godowns: godownRepository,
    parties: partyRepository,
    items: itemRepository,
    stock: stockStore,
  }),
  accounting: createAccountingRouter(
    ledgerAccountRepository,
    ledgerPostingRepository,
    membershipRepository,
  ),
  parties: createPartiesRouter(partyRepository),
  inventory: createInventoryRouter(
    itemRepository,
    stockStore,
    godownRepository,
    priceListRepository,
  ),
  purchases: createPurchasesRouter(
    purchaseBillRepository,
    ledgerPostingRepository,
    stockStore,
    dashboardSummaryRepository,
    itemRepository,
  ),
  purchaseOrders: createPurchaseOrdersRouter(purchaseOrderRepository),
  purchaseGrns: createGrnRouter(
    grnRepository,
    purchaseOrderRepository,
    stockStore,
    itemRepository,
  ),
  sales: createSalesRouter(
    salesInvoiceRepository,
    ledgerPostingRepository,
    stockStore,
    dashboardSummaryRepository,
    partyRepository,
    itemRepository,
  ),
  payments: createPaymentsRouter(
    salesInvoiceRepository,
    purchaseBillRepository,
    ledgerPostingRepository,
  ),
  returns: createReturnsRouter(
    ledgerPostingRepository,
    stockStore,
    creditDebitNoteRepository,
  ),
  expenses: createExpensesRouter(expenseRepository, ledgerPostingRepository),
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
  dashboard: createDashboardRouter(dashboardSummaryRepository),
  documents: createDocumentsRouter(
    documentSequenceRepository,
    documentAttachmentRepository,
    purchaseBillRepository,
  ),
  imports: createImportsRouter(
    partyRepository,
    itemRepository,
    stockStore,
    ledgerAccountRepository,
    ledgerPostingRepository,
  ),
  salesDocuments: createSalesDocumentsRouter(
    salesDocumentRepository,
    itemRepository,
  ),
  ocr: createOcrRouter(
    ocrDraftRepository,
    documentAttachmentRepository,
    {
      parties: partyRepository,
      items: itemRepository,
      bills: purchaseBillRepository,
      posting: ledgerPostingRepository,
      stock: stockStore,
      ledgers: ledgerAccountRepository,
    },
  ),
  team: createTeamRouter({
    memberships: membershipRepository,
    invitations: invitationRepository,
    companies: companyRepository,
    users: userDirectory,
  }),
})
export type TRPCRouter = typeof trpcRouter
