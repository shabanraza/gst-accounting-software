import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import { postPurchaseReturn } from '#/features/returns/purchase-return-service.ts'
import { postSalesReturn } from '#/features/returns/sales-return-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

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

export const createReturnsRouter = (
  posting: LedgerPostingRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  notes: CreditDebitNoteRepository,
  sequences: DocumentSequenceRepository,
  financialYears: FinancialYearRepository,
  audit: AuditLogRepository,
) =>
  ({
    postSalesReturn: capabilityProcedure('post_sales')
      .input(salesReturnInputSchema)
      .mutation(async ({ ctx, input }) => {
        const note = await postSalesReturn(
          { posting, stock, notes, sequences, financialYears },
          input,
        )
        await recordDocumentEvent(audit, {
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
    postPurchaseReturn: capabilityProcedure('post_purchase')
      .input(purchaseReturnInputSchema)
      .mutation(async ({ ctx, input }) => {
        const note = await postPurchaseReturn(
          { posting, stock, notes, sequences, financialYears },
          input,
        )
        await recordDocumentEvent(audit, {
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
    listCreditDebitNotes: capabilityProcedure('view')
      .input(listReturnsInputSchema)
      .query(({ input }) => {
        return notes.listByCompanyId(input.companyId)
      }),
  }) satisfies TRPCRouterRecord
