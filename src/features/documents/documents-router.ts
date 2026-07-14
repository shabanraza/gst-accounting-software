import { z } from 'zod'

import {
  createDocumentAttachment,
  
  
  InMemoryObjectStorageAdapter
} from '#/features/documents/document-attachment-service.ts'
import type {DocumentAttachmentRepository, ObjectStorageAdapter} from '#/features/documents/document-attachment-service.ts';
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { companyProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'

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
  contentBase64: z.string().min(1).max(14_000_000),
})

async function assertLinkedDocument(
  bills: PurchaseBillRepository,
  input: {
    companyId: string
    linkedDocumentType: string
    linkedDocumentId: string
  },
) {
  if (input.linkedDocumentType !== 'purchase_bill') {
    return
  }

  const bill = await bills.findById(input.linkedDocumentId)
  if (!bill || bill.companyId !== input.companyId) {
    throw new Error('Linked purchase bill not found for company')
  }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function safeAttachmentFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || 'attachment'
  return base.replace(/[^\w.\- ()]/g, '_').slice(0, 200) || 'attachment'
}

export const createDocumentsRouter = (
  sequences: DocumentSequenceRepository,
  attachments: DocumentAttachmentRepository,
  bills: PurchaseBillRepository,
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
        await assertLinkedDocument(bills, input)
        const safeFilename = safeAttachmentFilename(input.originalFilename)
        const storageKey = `attachments/${input.companyId}/${input.linkedDocumentType}/${crypto.randomUUID()}/${safeFilename}`
        const body = Uint8Array.from(atob(input.contentBase64), (char) =>
          char.charCodeAt(0),
        )
        if (body.byteLength > MAX_UPLOAD_BYTES) {
          throw new Error('Attachment exceeds maximum upload size')
        }
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
          originalFilename: safeFilename,
          contentType: input.contentType,
          sizeBytes: body.byteLength,
        })
      }),
  }) satisfies TRPCRouterRecord
