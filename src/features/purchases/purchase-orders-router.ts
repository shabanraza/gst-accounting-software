import { z } from 'zod'

import {
  createPurchaseOrder,
  listPurchaseOrdersByCompany,
} from '#/features/purchases/purchase-order-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { PurchaseOrderRepository } from '#/features/purchases/purchase-order-service.ts'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  rate: z.string().min(1),
  gstRate: z.string().min(1),
})

const createInputSchema = z.object({
  companyId: z.string().uuid(),
  supplierId: z.string().uuid(),
  orderNumber: z.string().min(1),
  orderDate: z.string().min(1),
  narration: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

const listInputSchema = z.object({
  companyId: z.string().uuid(),
})

export const createPurchaseOrdersRouter = (
  repository: PurchaseOrderRepository,
) =>
  ({
    list: capabilityProcedure('view').input(listInputSchema).query(({ input }) => {
      return listPurchaseOrdersByCompany(repository, input.companyId)
    }),
    create: capabilityProcedure('post_purchase')
      .input(createInputSchema)
      .mutation(({ input }) => {
        return createPurchaseOrder(repository, input)
      }),
  }) satisfies TRPCRouterRecord
