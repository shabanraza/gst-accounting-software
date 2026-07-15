import { beforeEach, describe, expect, test, vi } from 'vitest'

const uploadAttachment = vi.fn()
const readFileAsBase64 = vi.fn()

vi.mock('./trpc-client.ts', () => ({
  trpcClient: {
    documents: {
      uploadAttachment: {
        mutate: (...args: unknown[]) => uploadAttachment(...args),
      },
    },
  },
}))

vi.mock('./read-file-base64.ts', () => ({
  readFileAsBase64: (...args: unknown[]) => readFileAsBase64(...args),
}))

import { uploadPurchaseBillAttachment } from './purchase-attachment.ts'

describe('uploadPurchaseBillAttachment', () => {
  beforeEach(() => {
    uploadAttachment.mockReset()
    readFileAsBase64.mockReset()
  })

  test('uploads purchase bill attachment with base64 payload', async () => {
    readFileAsBase64.mockResolvedValueOnce('ZmFrZQ==')
    uploadAttachment.mockResolvedValueOnce({ id: 'attachment-1' })

    await uploadPurchaseBillAttachment('company-1', 'bill-1', {
      uri: 'file:///bill.jpg',
      fileName: 'supplier-bill.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    })

    expect(readFileAsBase64).toHaveBeenCalledWith('file:///bill.jpg')
    expect(uploadAttachment).toHaveBeenCalledWith({
      companyId: 'company-1',
      linkedDocumentType: 'purchase_bill',
      linkedDocumentId: 'bill-1',
      originalFilename: 'supplier-bill.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024,
      contentBase64: 'ZmFrZQ==',
    })
  })
})
