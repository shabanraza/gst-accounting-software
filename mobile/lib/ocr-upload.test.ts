import { describe, expect, it, vi } from 'vitest'

import { createOcrDraftFromCapture } from './ocr-upload.ts'

const uploadAttachment = vi.fn()
const createOcrDraft = vi.fn()

vi.mock('./trpc-client.ts', () => ({
  trpcClient: {
    documents: {
      uploadAttachment: {
        mutate: (...args: unknown[]) => uploadAttachment(...args),
      },
    },
    ocr: {
      createOcrDraft: {
        mutate: (...args: unknown[]) => createOcrDraft(...args),
      },
    },
  },
}))

vi.mock('./read-file-base64.ts', () => ({
  readFileAsBase64: vi.fn(async () => 'encoded-image'),
}))

describe('createOcrDraftFromCapture', () => {
  it('uploads image bytes before creating an OCR draft', async () => {
    uploadAttachment.mockResolvedValueOnce({ id: 'attachment-1' })
    createOcrDraft.mockResolvedValueOnce({ id: 'draft-1' })

    await createOcrDraftFromCapture('company-1', {
      uri: 'file:///bill.jpg',
      fileName: 'bill.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    })

    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        linkedDocumentType: 'ocr_capture',
        originalFilename: 'bill.jpg',
        contentType: 'image/jpeg',
        contentBase64: 'encoded-image',
      }),
    )
    expect(createOcrDraft).toHaveBeenCalledWith({
      companyId: 'company-1',
      attachmentId: 'attachment-1',
      fields: expect.objectContaining({
        supplierName: expect.objectContaining({ value: expect.any(String) }),
      }),
    })
  })
})
