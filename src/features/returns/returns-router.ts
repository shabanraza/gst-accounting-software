import { z } from 'zod'

import { ensureSystemLedger } from '#/features/accounting/chart-of-accounts.ts'
import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import { postPurchaseReturn } from '#/features/returns/purchase-return-service.ts'
import { postSalesReturn } from '#/features/returns/sales-return-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'

const returnLineSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  rate: z.string().min(1),
  gstRate: z.string().min(1),
})

const salesReturnInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  customerId: z.string().uuid(),
  customerStateCode: z.string().length(2),
  salesInvoiceId: z.string().uuid(),
  returnDate: z.string().min(1),
  salesAccountId: z.string().uuid(),
  outputGstAccountId: z.string().uuid(),
  receivableAccountId: z.string().uuid(),
  stockAccountId: z.string().uuid().optional(),
  cogsAccountId: z.string().uuid().optional(),
  lines: z.array(returnLineSchema).min(1),
})

const purchaseReturnInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  supplierId: z.string().uuid(),
  supplierStateCode: z.string().length(2),
  purchaseBillId: z.string().uuid(),
  returnDate: z.string().min(1),
  purchaseAccountId: z.string().uuid(),
  inputGstAccountId: z.string().uuid(),
  payableAccountId: z.string().uuid(),
  stockAccountId: z.string().uuid().optional(),
  lines: z.array(returnLineSchema).min(1),
})

const listReturnsInputSchema = z.object({
  companyId: z.string().uuid(),
})

export type ReturnsRouterDeps = {
  /** Note, ledger, stock, document amount due and audit commit together. */
  transaction: PostingTransaction
  notes: CreditDebitNoteRepository
  financialYears: FinancialYearRepository
  /** Finds or creates the reverse charge GST ledger for returns on RCM bills. */
  ledgers: LedgerAccountRepository
}

export const createReturnsRouter = (deps: ReturnsRouterDeps) =>
  ({
    postSalesReturn: capabilityProcedure('post_sales')
      .input(salesReturnInputSchema)
      .mutation(({ ctx, input }) =>
        deps.transaction(async (tx) => {
          const note = await postSalesReturn(
            {
              posting: tx.posting,
              stock: tx.stock,
              notes: tx.creditDebitNotes,
              invoices: tx.invoices,
              sequences: tx.sequences,
              financialYears: deps.financialYears,
            },
            input,
          )
          await recordDocumentEvent(tx.audit, {
            companyId: note.companyId,
            actorUserId: ctx.userId,
            action: 'credit_note.posted',
            entityType: 'credit_note',
            entityId: note.id,
            documentNumber: note.noteNumber,
            amount: note.totalAmount,
          })
          return note
        }),
      ),
    postPurchaseReturn: capabilityProcedure('post_purchase')
      .input(purchaseReturnInputSchema)
      .mutation(({ ctx, input }) =>
        deps.transaction(async (tx) => {
          const bill = await tx.bills.findById(input.purchaseBillId)
          const reverseChargeAccountId =
            bill?.reverseCharge && bill.companyId === input.companyId
              ? (
                  await ensureSystemLedger(
                    deps.ledgers,
                    input.companyId,
                    'rcm_gst_payable',
                  )
                ).id
              : undefined
          const note = await postPurchaseReturn(
            {
              posting: tx.posting,
              stock: tx.stock,
              notes: tx.creditDebitNotes,
              bills: tx.bills,
              sequences: tx.sequences,
              financialYears: deps.financialYears,
            },
            { ...input, reverseChargeAccountId },
          )
          await recordDocumentEvent(tx.audit, {
            companyId: note.companyId,
            actorUserId: ctx.userId,
            action: 'debit_note.posted',
            entityType: 'debit_note',
            entityId: note.id,
            documentNumber: note.noteNumber,
            amount: note.totalAmount,
          })
          return note
        }),
      ),
    listCreditDebitNotes: capabilityProcedure('view')
      .input(listReturnsInputSchema)
      .query(({ input }) => {
        return deps.notes.listByCompanyId(input.companyId)
      }),
  }) satisfies TRPCRouterRecord
