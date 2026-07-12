import { z } from 'zod'

import {
  confirmOcrDraft,
  createOcrDraft,
  listOcrDraftsByCompany,
} from '#/features/ocr/ocr-draft-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { companyProcedure, publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { OcrDraftRepository } from '#/features/ocr/ocr-draft-service.ts'

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
})

export const createOcrRouter = (repository: OcrDraftRepository) =>
  ({
    list: publicProcedure.input(listOcrDraftsInputSchema).query(({ input }) => {
      return listOcrDraftsByCompany(repository, input.companyId)
    }),
    createOcrDraft: companyProcedure
      .input(createOcrDraftInputSchema)
      .mutation(({ input }) => createOcrDraft(repository, input)),
    confirm: capabilityProcedure('post_purchase')
      .input(confirmOcrDraftInputSchema)
      .mutation(({ input, ctx }) =>
        confirmOcrDraft(repository, {
          draftId: input.draftId,
          companyId: input.companyId,
          reviewedByUserId: ctx.userId,
        }),
      ),
  }) satisfies TRPCRouterRecord
