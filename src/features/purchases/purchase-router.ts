import { z } from 'zod'

import { recordPurchaseSummary } from '#/features/dashboard/dashboard-summary-service.ts'
import { postPurchaseBill } from '#/features/purchases/purchase-bill-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { companyProcedure } from '#/integrations/trpc/init.ts'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  rate: z.string().min(1),
  gstRate: z.string().min(1),
  discountPercent: z.string().optional(),
  godownName: z.string().nullable().optional(),
})

const postPurchaseBillInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  companyGstin: z.string().nullable().optional(),
  companyAddressLine1: z.string().optional(),
  companyAddressLine2: z.string().optional(),
  companyCity: z.string().optional(),
  companyPincode: z.string().optional(),
  financialYearStart: z.string().min(1),
  supplierId: z.string().uuid(),
  supplierStateCode: z.string().length(2).optional(),
  placeOfSupply: z.string().length(2).optional(),
  supplierBillNumber: z.string().min(1),
  billDate: z.string().min(1),
  dueDate: z.string().min(1),
  taxMode: z.enum(['exclusive', 'inclusive']).optional(),
  narration: z.string().optional(),
  freight: z.string().optional(),
  packing: z.string().optional(),
  roundOff: z.string().optional(),
  billDiscount: z.string().optional(),
  godownName: z.string().nullable().optional(),
  poReference: z.string().optional(),
  transportMode: z.string().optional(),
  vehicleNo: z.string().optional(),
  lrNumber: z.string().optional(),
  challanRef: z.string().optional(),
  purchaseAccountId: z.string().uuid(),
  inputGstAccountId: z.string().uuid(),
  payableAccountId: z.string().uuid(),
  stockAccountId: z.string().uuid(),
  skipStockMovement: z.boolean().optional(),
  lines: z.array(lineSchema).min(1),
})

const listPurchasesInputSchema = z.object({
  companyId: z.string().uuid(),
  includeLines: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  partyId: z.string().uuid().optional(),
  paymentStatus: z.enum(['Paid', 'Part paid', 'Pending']).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: z.string().optional(),
})

const getPurchaseBillInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
})

export const createPurchasesRouter = (
  bills: PurchaseBillRepository,
  posting: LedgerPostingRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  dashboard: DashboardSummaryRepository,
  items: ItemRepository,
  parties: PartyRepository,
) =>
  ({
    list: companyProcedure
      .input(listPurchasesInputSchema)
      .query(({ input }) => {
        return bills.listByCompanyId(input.companyId, {
          includeLines: input.includeLines ?? false,
          startDate: input.startDate,
          endDate: input.endDate,
          partyId: input.partyId,
          paymentStatus: input.paymentStatus,
          search: input.search,
          limit: input.limit,
          cursor: input.cursor,
        })
      }),
    getById: companyProcedure
      .input(getPurchaseBillInputSchema)
      .query(async ({ input }) => {
        const bill = await bills.findById(input.id)
        if (!bill || bill.companyId !== input.companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        return bill
      }),
    postBill: capabilityProcedure('post_purchase')
      .input(postPurchaseBillInputSchema)
      .mutation(async ({ input }) => {
        const bill = await postPurchaseBill(
          { bills, posting, stock, items, parties },
          input,
        )
        const stockInQuantity = bill.lines
          .reduce((sum, line) => sum + Number(line.quantity), 0)
          .toFixed(0)

        await recordPurchaseSummary(dashboard, {
          companyId: bill.companyId,
          summaryDate: bill.billDate,
          purchaseAmount: bill.totalAmount,
          payableAmount: bill.outstandingAmount,
          stockInQuantity,
        })

        return bill
      }),
  }) satisfies TRPCRouterRecord
