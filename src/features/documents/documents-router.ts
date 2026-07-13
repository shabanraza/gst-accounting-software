import { z } from 'zod'

import {
  createDocumentAttachment,
  type DocumentAttachmentRepository,
  type ObjectStorageAdapter,
  InMemoryObjectStorageAdapter,
} from '#/features/documents/document-attachment-service.ts'
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { companyProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
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

const uploadAttachmentInputSchema = createAttachmentInputSchema.extend({
  contentBase64: z.string().min(1),
})

export const createDocumentsRouter = (
  sequences: DocumentSequenceRepository,
  attachments: DocumentAttachmentRepository,
  storage: ObjectStorageAdapter = new InMemoryObjectStorageAdapter(),
) =>
  ({
    nextNumber: companyProcedure
      .input(nextNumberInputSchema)
      .mutation(({ input }) => {
        return nextDocumentNumber(sequences, input)
      }),
    createAttachment: capabilityProcedure('post_purchase')
      .input(createAttachmentInputSchema)
      .mutation(({ input }) => {
        const storageKey = `attachments/${input.companyId}/${input.linkedDocumentType}/${crypto.randomUUID()}/${input.originalFilename}`
        return createDocumentAttachment(attachments, {
          ...input,
          storageKey,
        })
      }),
    uploadAttachment: capabilityProcedure('post_purchase')
      .input(uploadAttachmentInputSchema)
      .mutation(async ({ input }) => {
        const storageKey = `attachments/${input.companyId}/${input.linkedDocumentType}/${crypto.randomUUID()}/${input.originalFilename}`
        const body = Uint8Array.from(atob(input.contentBase64), (char) =>
          char.charCodeAt(0),
        )
        await storage.putObject({
          key: storageKey,
          body,
          contentType: input.contentType,
        })
        return createDocumentAttachment(attachments, {
          companyId: input.companyId,
          linkedDocumentType: input.linkedDocumentType,
          linkedDocumentId: input.linkedDocumentId,
          storageKey,
          originalFilename: input.originalFilename,
          contentType: input.contentType,
          sizeBytes: body.byteLength,
        })
      }),
  }) satisfies TRPCRouterRecord
