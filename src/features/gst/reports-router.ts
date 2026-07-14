import { buildAccountantExport } from '#/features/exports/accountant-export-service.ts'
import { buildCashBook } from '#/features/accounting/cash-book-service.ts'
import { buildDayBook } from '#/features/accounting/day-book-service.ts'
import { buildHsnSummary } from '#/features/gst/hsn-summary-service.ts'
import { buildGstDocuments } from '#/features/gst/gst-report-documents.ts'
import {
  buildGstr1Json,
  buildGstr1Report,
} from '#/features/gst/gstr1-report-service.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import {
  buildBalanceSheet,
  buildProfitAndLoss,
  buildTrialBalance,
} from '#/features/accounting/financial-reports.ts'
import {
  buildPayablesAgeing,
  buildReceivablesAgeing,
} from '#/features/accounting/ageing-service.ts'
import { buildPartyLedger } from '#/features/parties/party-ledger-service.ts'
import {
  buildStockLedger,
  buildStockSummary,
} from '#/features/inventory/stock-ledger-service.ts'
import { buildStockValuation } from '#/features/inventory/stock-valuation-service.ts'
import { reconcileGstr1 } from '#/features/gst/gstr1-reconciliation-service.ts'
import {
  reconcileGstr2b,
  setGstr2bItcDecision,
} from '#/features/gst/gstr2b-reconciliation-service.ts'
import { buildGstr3bWorkingReport } from '#/features/gst/gstr3b-working-service.ts'
import { gstReconciliationRepository } from '#/features/gst/gst-reconciliation-store.ts'
import { z } from 'zod'

import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

const reportInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
})

const companyAndPartyInputSchema = z.object({
  companyId: z.string().uuid(),
  partyId: z.string().uuid(),
})

const companyAndItemInputSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const gstPortalRowSchema = z.object({
  supplierGstin: z.string(),
  supplierInvoiceNumber: z.string(),
  invoiceDate: z.string(),
  taxableAmount: z.string(),
  cgstAmount: z.string().default('0.00'),
  sgstAmount: z.string().default('0.00'),
  igstAmount: z.string().default('0.00'),
  totalGstAmount: z.string(),
})

const gstr2bReconciliationInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  portalRows: z.array(gstPortalRowSchema),
})

const gstr1ReconciliationInputSchema = z.object({
  companyId: z.string().uuid(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  portalRows: z.array(
    z.object({
      customerGstin: z.string(),
      invoiceNumber: z.string(),
      invoiceDate: z.string(),
      taxableAmount: z.string(),
      cgstAmount: z.string().default('0.00'),
      sgstAmount: z.string().default('0.00'),
      igstAmount: z.string().default('0.00'),
      totalGstAmount: z.string(),
    }),
  ),
})

const gstr2bItcDecisionInputSchema = z.object({
  companyId: z.string().uuid(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  rowKey: z.string().min(1),
  status: z.enum(['pending', 'accepted', 'rejected']),
})

const gstr3bWorkingInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  portalRows: z.array(gstPortalRowSchema),
})

export const createReportsRouter = (deps: {
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  parties: PartyRepository
  ledgers: LedgerAccountRepository
  postings: LedgerPostingRepository
  notes: CreditDebitNoteRepository
  stockMovements: StockMovementRepository
  stockBalances: StockBalanceRepository
  items: ItemRepository
}) =>
  ({
    gstr1: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        const documents = await buildGstDocuments({
          companyId: input.companyId,
          companyStateCode: input.companyStateCode,
          invoices: deps.invoices,
          bills: deps.bills,
          parties: deps.parties,
        })
        return buildGstr1Report({
          companyId: input.companyId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          documents,
        })
      }),
    gstr3b: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        const documents = await buildGstDocuments({
          companyId: input.companyId,
          companyStateCode: input.companyStateCode,
          invoices: deps.invoices,
          bills: deps.bills,
          parties: deps.parties,
        })
        return buildGstr3bReport({
          companyId: input.companyId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          documents,
        })
      }),
    trialBalance: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(async ({ input }) => {
        const report = await buildTrialBalance(
          { ledgers: deps.ledgers, postings: deps.postings },
          input.companyId,
        )
        return report.rows.map((row) => ({
          id: row.accountId,
          code: row.code,
          name: row.name,
          accountType: row.accountType,
          debit: row.balanceType === 'debit' ? row.balance : '0.00',
          credit: row.balanceType === 'credit' ? row.balance : '0.00',
        }))
      }),
    profitAndLoss: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildProfitAndLoss(
          { ledgers: deps.ledgers, postings: deps.postings },
          input.companyId,
        )
      }),
    balanceSheet: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildBalanceSheet(
          { ledgers: deps.ledgers, postings: deps.postings },
          input.companyId,
        )
      }),
    partyLedger: capabilityProcedure('view_reports')
      .input(companyAndPartyInputSchema)
      .query(({ input }) => {
        return buildPartyLedger(
          { invoices: deps.invoices, bills: deps.bills, notes: deps.notes },
          input.companyId,
          input.partyId,
        )
      }),
    receivablesAgeing: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildReceivablesAgeing(
          { invoices: deps.invoices, parties: deps.parties },
          input.companyId,
        )
      }),
    payablesAgeing: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildPayablesAgeing(
          { bills: deps.bills, parties: deps.parties },
          input.companyId,
        )
      }),
    stockSummary: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildStockSummary(
          { balances: deps.stockBalances, items: deps.items },
          input.companyId,
        )
      }),
    stockValuation: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildStockValuation(
          { balances: deps.stockBalances, items: deps.items },
          input.companyId,
        )
      }),
    stockLedger: capabilityProcedure('view_reports')
      .input(companyAndItemInputSchema)
      .query(({ input }) => {
        return buildStockLedger(
          { movements: deps.stockMovements },
          input.companyId,
          input.itemId,
        )
      }),
    gstr1Json: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        const documents = await buildGstDocuments({
          companyId: input.companyId,
          companyStateCode: input.companyStateCode,
          invoices: deps.invoices,
          bills: deps.bills,
          parties: deps.parties,
        })
        const report = buildGstr1Report({
          companyId: input.companyId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          documents,
        })
        return buildGstr1Json(report)
      }),
    gstr2bReconciliation: capabilityProcedure('view_reports')
      .input(gstr2bReconciliationInputSchema)
      .mutation(({ input }) => {
        return reconcileGstr2b(
          {
            bills: deps.bills,
            parties: deps.parties,
            recon: gstReconciliationRepository,
          },
          input,
        )
      }),
    setGstr2bItcDecision: capabilityProcedure('view_reports')
      .input(gstr2bItcDecisionInputSchema)
      .mutation(({ input }) => {
        return setGstr2bItcDecision(
          { recon: gstReconciliationRepository },
          input,
        )
      }),
    gstr1Reconciliation: capabilityProcedure('view_reports')
      .input(gstr1ReconciliationInputSchema)
      .mutation(({ input }) => {
        return reconcileGstr1(
          { invoices: deps.invoices, parties: deps.parties },
          input,
        )
      }),
    gstr3bWorking: capabilityProcedure('view_reports')
      .input(gstr3bWorkingInputSchema)
      .mutation(async ({ input }) => {
        const documents = await buildGstDocuments({
          companyId: input.companyId,
          companyStateCode: input.companyStateCode,
          invoices: deps.invoices,
          bills: deps.bills,
          parties: deps.parties,
        })
        return buildGstr3bWorkingReport(
          {
            bills: deps.bills,
            parties: deps.parties,
            recon: gstReconciliationRepository,
          },
          { ...input, documents },
        )
      }),
    dayBook: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildDayBook(deps.postings, input.companyId, {
          startDate: input.periodStart,
          endDate: input.periodEnd,
        })
      }),
    cashBook: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildCashBook(
          { postings: deps.postings, ledgers: deps.ledgers },
          input.companyId,
          { startDate: input.periodStart, endDate: input.periodEnd },
        )
      }),
    hsnSummary: capabilityProcedure('view_reports')
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildHsnSummary(
          { invoices: deps.invoices, items: deps.items },
          input.companyId,
          { startDate: input.periodStart, endDate: input.periodEnd },
        )
      }),
    accountantExport: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(async ({ input }) => {
        return buildAccountantExport(
          {
            ledgers: deps.ledgers,
            postings: deps.postings,
            invoices: deps.invoices,
            bills: deps.bills,
          },
          input.companyId,
        )
      }),
  }) satisfies TRPCRouterRecord
