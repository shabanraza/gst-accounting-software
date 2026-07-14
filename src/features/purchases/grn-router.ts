import { z } from 'zod'

import {
  buildPurchaseBillDraftFromGrn,
  createGrnFromPurchaseOrder,
  getGrnById,
  listGrnsByCompany,
  markGrnConverted,
} from '#/features/purchases/grn-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { GrnRepository } from '#/features/purchases/grn-service.ts'
import type { PurchaseOrderRepository } from '#/features/purchases/purchase-order-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

const listInputSchema = z.object({
  companyId: z.string().uuid(),
})

const byIdInputSchema = z.object({
  companyId: z.string().uuid(),
  grnId: z.string().uuid(),
})

const receiveFromPoInputSchema = z.object({
  companyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  grnNumber: z.string().min(1),
  grnDate: z.string().min(1),
  godownName: z.string().optional(),
  narration: z.string().optional(),
})

const markConvertedInputSchema = byIdInputSchema.extend({
  billId: z.string().uuid(),
})

export const createGrnRouter = (
  grnRepository: GrnRepository,
  purchaseOrderRepository: PurchaseOrderRepository,
  stockStore: StockMovementRepository & StockBalanceRepository,
  itemRepository: ItemRepository,
) =>
  ({
    list: publicProcedure.input(listInputSchema).query(({ input }) => {
      return listGrnsByCompany(grnRepository, input.companyId)
    }),
    getById: publicProcedure.input(byIdInputSchema).query(({ input }) => {
      return getGrnById(grnRepository, input.companyId, input.grnId)
    }),
    buildBillDraft: publicProcedure
      .input(byIdInputSchema)
      .query(({ input }) => {
        return buildPurchaseBillDraftFromGrn(
          grnRepository,
          itemRepository,
          input.companyId,
          input.grnId,
        )
      }),
    receiveFromPurchaseOrder: capabilityProcedure('post_purchase')
      .input(receiveFromPoInputSchema)
      .mutation(({ input }) => {
        return createGrnFromPurchaseOrder(
          grnRepository,
          purchaseOrderRepository,
          stockStore,
          input,
        )
      }),
    markConverted: capabilityProcedure('post_purchase')
      .input(markConvertedInputSchema)
      .mutation(({ input }) => {
        return markGrnConverted(
          grnRepository,
          input.companyId,
          input.grnId,
          input.billId,
        )
      }),
  }) satisfies TRPCRouterRecord
