import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import {
  confirmOcrDraft,
  createOcrDraft,
  listOcrDraftsByCompany,
  updateOcrDraftFields,
} from '#/features/ocr/ocr-draft-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { DocumentAttachmentRepository } from '#/features/documents/document-attachment-service.ts'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
import type {
  OcrConfirmDependencies,
  OcrDraftRepository,
} from '#/features/ocr/ocr-draft-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'

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

const updateOcrDraftInputSchema = z.object({
  companyId: z.string().uuid(),
  draftId: z.string().uuid(),
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

export const createOcrRouter = (
  repository: OcrDraftRepository,
  attachments: DocumentAttachmentRepository,
  ledgers: LedgerAccountRepository,
  transaction: PostingTransaction,
) =>
  ({
    list: capabilityProcedure('view')
      .input(listOcrDraftsInputSchema)
      .query(({ input }) => {
        return listOcrDraftsByCompany(repository, input.companyId)
      }),
    createOcrDraft: capabilityProcedure('post_purchase')
      .input(createOcrDraftInputSchema)
      .mutation(({ input }) => createOcrDraft(repository, attachments, input)),
    updateDraft: capabilityProcedure('post_purchase')
      .input(updateOcrDraftInputSchema)
      .mutation(({ input }) =>
        updateOcrDraftFields(repository, {
          companyId: input.companyId,
          draftId: input.draftId,
          fields: input.fields,
        }),
      ),
    confirm: capabilityProcedure('post_purchase')
      .input(confirmOcrDraftInputSchema)
      .mutation(({ input, ctx }) =>
        transaction(async (tx) => {
          const draft = await confirmOcrDraft(
            repository,
            { ...tx, ledgers },
            {
              draftId: input.draftId,
              companyId: input.companyId,
              reviewedByUserId: ctx.userId,
              companyStateCode: input.companyStateCode,
              financialYearStart: input.financialYearStart,
              purchaseAccountId: input.purchaseAccountId,
              inputGstAccountId: input.inputGstAccountId,
              payableAccountId: input.payableAccountId,
              stockAccountId: input.stockAccountId,
            },
          )
          const bill = draft.postedPurchaseBillId
            ? await tx.bills.findById(draft.postedPurchaseBillId)
            : null
          if (bill) {
            await recordDocumentEvent(tx.audit, {
              companyId: bill.companyId,
              actorUserId: ctx.userId,
              action: 'scanned_bill.confirmed',
              entityType: 'purchase_bill',
              entityId: bill.id,
              documentNumber: bill.supplierBillNumber,
              amount: bill.totalAmount,
            })
          }
          return draft
        }),
      ),
  }) satisfies TRPCRouterRecord

export type OcrRouterDeps = {
  repository: OcrDraftRepository
  parties: PartyRepository
  items: ItemRepository
} & Pick<OcrConfirmDependencies, 'bills' | 'posting' | 'stock'>
