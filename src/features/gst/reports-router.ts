import { buildAccountantExport } from '#/features/exports/accountant-export-service.ts'
import { buildCashBook } from '#/features/accounting/cash-book-service.ts'
import { buildDayBook } from '#/features/accounting/day-book-service.ts'
import { buildHsnSummary } from '#/features/gst/hsn-summary-service.ts'
import Decimal from 'decimal.js'

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
import { reconcileGstr2b } from '#/features/gst/gstr2b-reconciliation-service.ts'
import { z } from 'zod'

import { companyProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { GstReportDocument } from '#/features/gst/gst-report-types.ts'
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

async function buildGstDocuments(input: {
  companyId: string
  companyStateCode: string
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  parties: PartyRepository
}): Promise<Array<GstReportDocument>> {
  const [sales, purchases, partyList] = await Promise.all([
    input.invoices.listByCompanyId(input.companyId),
    input.bills.listByCompanyId(input.companyId),
    input.parties.listByCompanyId(input.companyId),
  ])
  const partyById = new Map(partyList.map((party) => [party.id, party]))

  const salesDocs: Array<GstReportDocument> = sales.map((invoice) => {
    const party = partyById.get(invoice.customerId)
    const partyState = party?.stateCode ?? input.companyStateCode
    const supplyType =
      partyState === input.companyStateCode ? 'intra_state' : 'inter_state'
    const half = new Decimal(invoice.totalGstAmount).div(2).toFixed(2)
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      documentType: 'sales_invoice',
      documentDate: invoice.invoiceDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Customer',
      placeOfSupply: partyState,
      supplyType,
      taxableAmount: invoice.taxableAmount,
      cgstAmount: supplyType === 'intra_state' ? half : '0.00',
      sgstAmount: supplyType === 'intra_state' ? half : '0.00',
      igstAmount:
        supplyType === 'inter_state' ? invoice.totalGstAmount : '0.00',
      totalGstAmount: invoice.totalGstAmount,
      totalAmount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
    }
  })

  const purchaseDocs: Array<GstReportDocument> = purchases.map((bill) => {
    const party = partyById.get(bill.supplierId)
    const partyState = party?.stateCode ?? '24'
    const supplyType =
      partyState === input.companyStateCode ? 'intra_state' : 'inter_state'
    const half = new Decimal(bill.totalGstAmount).div(2).toFixed(2)
    return {
      id: bill.id,
      companyId: bill.companyId,
      documentType: 'purchase_bill',
      documentDate: bill.billDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Supplier',
      placeOfSupply: partyState,
      supplyType,
      taxableAmount: bill.taxableAmount,
      cgstAmount: supplyType === 'intra_state' ? half : '0.00',
      sgstAmount: supplyType === 'intra_state' ? half : '0.00',
      igstAmount: supplyType === 'inter_state' ? bill.totalGstAmount : '0.00',
      totalGstAmount: bill.totalGstAmount,
      totalAmount: bill.totalAmount,
      invoiceNumber: bill.supplierBillNumber,
    }
  })

  return [...salesDocs, ...purchaseDocs]
}

const companyAndPartyInputSchema = z.object({
  companyId: z.string().uuid(),
  partyId: z.string().uuid(),
})

const companyAndItemInputSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const gstr2bReconciliationInputSchema = z.object({
  companyId: z.string().uuid(),
  portalRows: z.array(
    z.object({
      supplierGstin: z.string(),
      supplierInvoiceNumber: z.string(),
      invoiceDate: z.string(),
      taxableAmount: z.string(),
      totalGstAmount: z.string(),
    }),
  ),
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
    gstr1: companyProcedure
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
    gstr3b: companyProcedure
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
    trialBalance: companyProcedure
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
    profitAndLoss: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildProfitAndLoss(
          { ledgers: deps.ledgers, postings: deps.postings },
          input.companyId,
        )
      }),
    balanceSheet: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildBalanceSheet(
          { ledgers: deps.ledgers, postings: deps.postings },
          input.companyId,
        )
      }),
    partyLedger: companyProcedure
      .input(companyAndPartyInputSchema)
      .query(({ input }) => {
        return buildPartyLedger(
          { invoices: deps.invoices, bills: deps.bills, notes: deps.notes },
          input.companyId,
          input.partyId,
        )
      }),
    receivablesAgeing: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildReceivablesAgeing(
          { invoices: deps.invoices, parties: deps.parties },
          input.companyId,
        )
      }),
    payablesAgeing: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildPayablesAgeing(
          { bills: deps.bills, parties: deps.parties },
          input.companyId,
        )
      }),
    stockSummary: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildStockSummary(
          { balances: deps.stockBalances, items: deps.items },
          input.companyId,
        )
      }),
    stockValuation: companyProcedure
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return buildStockValuation(
          { balances: deps.stockBalances, items: deps.items },
          input.companyId,
        )
      }),
    stockLedger: companyProcedure
      .input(companyAndItemInputSchema)
      .query(({ input }) => {
        return buildStockLedger(
          { movements: deps.stockMovements },
          input.companyId,
          input.itemId,
        )
      }),
    gstr1Json: companyProcedure
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
    gstr2bReconciliation: companyProcedure
      .input(gstr2bReconciliationInputSchema)
      .mutation(({ input }) => {
        return reconcileGstr2b(
          { bills: deps.bills },
          input.companyId,
          input.portalRows,
        )
      }),
    dayBook: companyProcedure
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildDayBook(deps.postings, input.companyId, {
          startDate: input.periodStart,
          endDate: input.periodEnd,
        })
      }),
    cashBook: companyProcedure
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildCashBook(
          { postings: deps.postings, ledgers: deps.ledgers },
          input.companyId,
          { startDate: input.periodStart, endDate: input.periodEnd },
        )
      }),
    hsnSummary: companyProcedure
      .input(reportInputSchema)
      .query(async ({ input }) => {
        return buildHsnSummary(
          { invoices: deps.invoices, items: deps.items },
          input.companyId,
          { startDate: input.periodStart, endDate: input.periodEnd },
        )
      }),
    accountantExport: companyProcedure
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
