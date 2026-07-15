import { randomId } from './random-id.ts'
import { trpcClient } from './trpc-client.ts'
import { buildEmptyOcrFields } from './ocr-fields.ts'
import { readFileAsBase64 } from './read-file-base64.ts'

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
  const linkedDocumentId = randomId()
  const contentBase64 = await readFileAsBase64(asset.uri)

  const attachment = await trpcClient.documents.uploadAttachment.mutate({
    companyId,
    linkedDocumentType: 'ocr_capture',
    linkedDocumentId,
    originalFilename: asset.fileName ?? 'bill.jpg',
    contentType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? 0,
    contentBase64,
  })

  return trpcClient.ocr.createOcrDraft.mutate({
    companyId,
    attachmentId: attachment.id,
    fields: buildEmptyOcrFields(),
  })
}
