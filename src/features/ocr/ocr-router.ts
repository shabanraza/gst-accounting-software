import { z } from 'zod'

import {
  confirmOcrDraft,
  createOcrDraft,
  listOcrDraftsByCompany,
} from '#/features/ocr/ocr-draft-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { companyProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  OcrConfirmDependencies,
  OcrDraftRepository,
} from '#/features/ocr/ocr-draft-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'

const ocrFieldSchema = z.object({
  value: z.string(),
  confidence: z.number(),
})

const createOcrDraftInputSchema = z.object({
  companyId: z.string().uuid(),
  attachmentId: z.string().uuid(),
  fields: z.object({
    supplierName: ocrFieldSchema,
    supplierGstin: ocrFieldSchema,
    billNumber: ocrFieldSchema,
    billDate: ocrFieldSchema,
    taxableAmount: ocrFieldSchema,
    gstAmount: ocrFieldSchema,
    totalAmount: ocrFieldSchema,
  }),
})

const listOcrDraftsInputSchema = z.object({
  companyId: z.string().uuid(),
})

const confirmOcrDraftInputSchema = z.object({
  companyId: z.string().uuid(),
  draftId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  financialYearStart: z.string().min(1),
  purchaseAccountId: z.string().uuid(),
  inputGstAccountId: z.string().uuid(),
  payableAccountId: z.string().uuid(),
  stockAccountId: z.string().uuid(),
})

export const createOcrRouter = (
  repository: OcrDraftRepository,
  deps: Pick<OcrConfirmDependencies, 'parties' | 'items' | 'bills' | 'posting' | 'stock'>,
) =>
  ({
    list: companyProcedure.input(listOcrDraftsInputSchema).query(({ input }) => {
      return listOcrDraftsByCompany(repository, input.companyId)
    }),
    createOcrDraft: capabilityProcedure('post_purchase')
      .input(createOcrDraftInputSchema)
      .mutation(({ input }) => createOcrDraft(repository, input)),
    confirm: capabilityProcedure('post_purchase')
      .input(confirmOcrDraftInputSchema)
      .mutation(({ input, ctx }) =>
        confirmOcrDraft(repository, { ...deps }, {
          draftId: input.draftId,
          companyId: input.companyId,
          reviewedByUserId: ctx.userId,
          companyStateCode: input.companyStateCode,
          financialYearStart: input.financialYearStart,
          purchaseAccountId: input.purchaseAccountId,
          inputGstAccountId: input.inputGstAccountId,
          payableAccountId: input.payableAccountId,
          stockAccountId: input.stockAccountId,
        }),
      ),
  }) satisfies TRPCRouterRecord

export type OcrRouterDeps = {
  repository: OcrDraftRepository
  parties: PartyRepository
  items: ItemRepository
} & Pick<OcrConfirmDependencies, 'bills' | 'posting' | 'stock'>
