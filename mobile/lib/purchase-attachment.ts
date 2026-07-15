import { readFileAsBase64 } from './read-file-base64.ts'
import { trpcClient } from './trpc-client.ts'

export type PurchaseAttachmentAsset = {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
}

export async function uploadPurchaseBillAttachment(
  companyId: string,
  billId: string,
  asset: PurchaseAttachmentAsset,
) {
  const contentBase64 = await readFileAsBase64(asset.uri)

  return trpcClient.documents.uploadAttachment.mutate({
    companyId,
    linkedDocumentType: 'purchase_bill',
    linkedDocumentId: billId,
    originalFilename: asset.fileName ?? 'bill.jpg',
    contentType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? 0,
    contentBase64,
  })
}
