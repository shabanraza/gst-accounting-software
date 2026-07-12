import { describe, expect, test } from 'vitest'

import { createDocumentAttachment } from '#/features/documents/document-attachment-service.ts'
import type {
  DocumentAttachmentRecord,
  DocumentAttachmentRepository,
} from '#/features/documents/document-attachment-service.ts'
import {
  confirmOcrDraft,
  createOcrDraft,
} from '#/features/ocr/ocr-draft-service.ts'
import type {
  OcrDraftRecord,
  OcrDraftRepository,
} from '#/features/ocr/ocr-draft-service.ts'

class InMemoryDocumentAttachmentRepository implements DocumentAttachmentRepository {
  private attachments: Array<DocumentAttachmentRecord> = []

  async create(attachment: DocumentAttachmentRecord) {
    this.attachments.push(attachment)
    return attachment
  }

  async findById(id: string) {
    return this.attachments.find((attachment) => attachment.id === id) ?? null
  }
}

class InMemoryOcrDraftRepository implements OcrDraftRepository {
  private drafts: Array<OcrDraftRecord> = []

  async create(draft: OcrDraftRecord) {
    this.drafts.push(draft)
    return draft
  }

  async findById(id: string) {
    return this.drafts.find((draft) => draft.id === id) ?? null
  }

  async save(draft: OcrDraftRecord) {
    const index = this.drafts.findIndex((item) => item.id === draft.id)
    if (index >= 0) {
      this.drafts[index] = draft
    }
    return draft
  }
}

describe('document attachments', () => {
  test('stores bill attachment metadata with company isolation fields', async () => {
    const repository = new InMemoryDocumentAttachmentRepository()

    const attachment = await createDocumentAttachment(repository, {
      companyId: 'company-1',
      linkedDocumentType: 'purchase_bill',
      linkedDocumentId: 'bill-1',
      storageKey: 'companies/company-1/bills/bill-1.pdf',
      originalFilename: 'supplier-bill.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
    })

    expect(attachment.storageKey).toContain('company-1')
    expect(attachment.originalFilename).toBe('supplier-bill.pdf')
    expect(attachment.companyId).toBe('company-1')
  })

  test('rejects cross-company attachment link attempts', async () => {
    const repository = new InMemoryDocumentAttachmentRepository()

    await expect(
      createDocumentAttachment(repository, {
        companyId: 'company-1',
        linkedDocumentType: 'purchase_bill',
        linkedDocumentId: 'bill-1',
        storageKey: 'companies/company-2/bills/bill-1.pdf',
        originalFilename: 'supplier-bill.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
      }),
    ).rejects.toThrow(/company/i)
  })
})

describe('ocr drafts', () => {
  test('stores extracted fields with confidence and does not auto-post', async () => {
    const repository = new InMemoryOcrDraftRepository()

    const draft = await createOcrDraft(repository, {
      companyId: 'company-1',
      attachmentId: 'att-1',
      fields: {
        supplierName: { value: 'Textile Mills', confidence: 0.92 },
        supplierGstin: { value: '24AABCU9603R1ZM', confidence: 0.88 },
        billNumber: { value: 'SUP-1001', confidence: 0.95 },
        billDate: { value: '2026-07-11', confidence: 0.81 },
        taxableAmount: { value: '8000.00', confidence: 0.9 },
        gstAmount: { value: '400.00', confidence: 0.74 },
        totalAmount: { value: '8400.00', confidence: 0.91 },
      },
    })

    expect(draft.status).toBe('needs_review')
    expect(draft.postedPurchaseBillId).toBeNull()
    expect(draft.fields.gstAmount.confidence).toBe(0.74)
    expect(draft.lowConfidenceFields).toContain('gstAmount')
  })

  test('confirmation only marks draft ready for purchase conversion', async () => {
    const repository = new InMemoryOcrDraftRepository()

    const draft = await createOcrDraft(repository, {
      companyId: 'company-1',
      attachmentId: 'att-1',
      fields: {
        supplierName: { value: 'Textile Mills', confidence: 0.92 },
        supplierGstin: { value: '24AABCU9603R1ZM', confidence: 0.88 },
        billNumber: { value: 'SUP-1001', confidence: 0.95 },
        billDate: { value: '2026-07-11', confidence: 0.81 },
        taxableAmount: { value: '8000.00', confidence: 0.9 },
        gstAmount: { value: '400.00', confidence: 0.9 },
        totalAmount: { value: '8400.00', confidence: 0.91 },
      },
    })

    const confirmed = await confirmOcrDraft(repository, {
      draftId: draft.id,
      companyId: 'company-1',
      reviewedByUserId: 'user-1',
    })

    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.postedPurchaseBillId).toBeNull()
  })
})
