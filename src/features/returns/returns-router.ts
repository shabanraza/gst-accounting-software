import { z } from 'zod'

import { postPurchaseReturn } from '#/features/returns/purchase-return-service.ts'
import { postSalesReturn } from '#/features/returns/sales-return-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
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
  lines: z.array(returnLineSchema).min(1),
})

const listReturnsInputSchema = z.object({
  companyId: z.string().uuid(),
})

export const createReturnsRouter = (
  posting: LedgerPostingRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  notes: CreditDebitNoteRepository,
) =>
  ({
    postSalesReturn: capabilityProcedure('post_sales')
      .input(salesReturnInputSchema)
      .mutation(({ input }) => {
        return postSalesReturn({ posting, stock, notes }, input)
      }),
    postPurchaseReturn: capabilityProcedure('post_purchase')
      .input(purchaseReturnInputSchema)
      .mutation(({ input }) => {
        return postPurchaseReturn({ posting, stock, notes }, input)
      }),
    listCreditDebitNotes: capabilityProcedure('view')
      .input(listReturnsInputSchema)
      .query(({ input }) => {
        return notes.listByCompanyId(input.companyId)
      }),
  }) satisfies TRPCRouterRecord
