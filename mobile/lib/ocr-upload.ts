import { trpcClient } from './trpc-client.ts'
import { buildPlaceholderOcrFields } from './ocr-fields.ts'

type CaptureAsset = {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
}

export async function createOcrDraftFromCapture(
  companyId: string,
  asset: CaptureAsset,
) {
  const attachment = await trpcClient.documents.createAttachment.mutate({
    companyId,
    linkedDocumentType: 'ocr_capture',
    linkedDocumentId: crypto.randomUUID(),
    originalFilename: asset.fileName ?? 'bill.jpg',
    contentType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? 0,
  })

  return trpcClient.ocr.createOcrDraft.mutate({
    companyId,
    attachmentId: attachment.id,
    fields: buildPlaceholderOcrFields(),
  })
}
