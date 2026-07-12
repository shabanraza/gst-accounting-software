import { z } from 'zod'

import { createDocumentAttachment } from '#/features/documents/document-attachment-service.ts'
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { companyProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { DocumentAttachmentRepository } from '#/features/documents/document-attachment-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'

const nextNumberInputSchema = z.object({
  companyId: z.string().uuid(),
  financialYearId: z.string().min(1),
  voucherType: z.enum(['sales', 'purchase', 'receipt', 'payment', 'expense']),
  series: z.string().min(1),
  padLength: z.number().int().min(0).optional(),
})

const createAttachmentInputSchema = z.object({
  companyId: z.string().uuid(),
  linkedDocumentType: z.string().min(1),
  linkedDocumentId: z.string().uuid(),
  originalFilename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().min(0),
})

export const createDocumentsRouter = (
  sequences: DocumentSequenceRepository,
  attachments: DocumentAttachmentRepository,
) =>
  ({
    nextNumber: companyProcedure
      .input(nextNumberInputSchema)
      .mutation(({ input }) => {
        return nextDocumentNumber(sequences, input)
      }),
    createAttachment: companyProcedure
      .input(createAttachmentInputSchema)
      .mutation(({ input }) => {
        const storageKey = `attachments/${input.companyId}/${input.linkedDocumentType}/${crypto.randomUUID()}/${input.originalFilename}`
        return createDocumentAttachment(attachments, {
          ...input,
          storageKey,
        })
      }),
  }) satisfies TRPCRouterRecord
