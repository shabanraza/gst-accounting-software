import { z } from 'zod'

import {
  buildSalesInvoiceDraftFromDocument,
  createSalesDocument,
  getSalesDocumentById,
  listSalesDocumentsByCompany,
  markSalesDocumentConverted,
} from '#/features/sales-documents/sales-document-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { SalesDocumentRepository } from '#/features/sales-documents/sales-document-service.ts'

const documentTypeSchema = z.enum([
  'quotation',
  'sales_order',
  'delivery_challan',
])

const lineSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  rate: z.string().min(1),
})

const createInputSchema = z.object({
  companyId: z.string().uuid(),
  documentType: documentTypeSchema,
  documentNumber: z.string().min(1),
  documentDate: z.string().min(1),
  customerId: z.string().uuid(),
  narration: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

const listInputSchema = z.object({
  companyId: z.string().uuid(),
  documentType: documentTypeSchema.optional(),
})

const byIdInputSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
})

const markConvertedInputSchema = byIdInputSchema.extend({
  invoiceId: z.string().uuid(),
})

export const createSalesDocumentsRouter = (
  repository: SalesDocumentRepository,
  itemRepository: ItemRepository,
) =>
  ({
    list: publicProcedure.input(listInputSchema).query(({ input }) => {
      return listSalesDocumentsByCompany(
        repository,
        input.companyId,
        input.documentType,
      )
    }),
    getById: publicProcedure.input(byIdInputSchema).query(({ input }) => {
      return getSalesDocumentById(repository, input.companyId, input.documentId)
    }),
    buildInvoiceDraft: publicProcedure
      .input(byIdInputSchema)
      .query(({ input }) => {
        return buildSalesInvoiceDraftFromDocument(
          repository,
          itemRepository,
          input.companyId,
          input.documentId,
        )
      }),
    markConverted: capabilityProcedure('post_sales')
      .input(markConvertedInputSchema)
      .mutation(({ input }) => {
        return markSalesDocumentConverted(
          repository,
          input.companyId,
          input.documentId,
          input.invoiceId,
        )
      }),
    create: capabilityProcedure('post_sales')
      .input(createInputSchema)
      .mutation(({ input }) => {
        return createSalesDocument(repository, input)
      }),
  }) satisfies TRPCRouterRecord
