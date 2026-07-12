export type OcrFieldValue = {
  value: string
  confidence: number
}

export type OcrDraftFields = {
  supplierName: OcrFieldValue
  supplierGstin: OcrFieldValue
  billNumber: OcrFieldValue
  billDate: OcrFieldValue
  taxableAmount: OcrFieldValue
  gstAmount: OcrFieldValue
  totalAmount: OcrFieldValue
}

export type OcrDraftStatus = 'needs_review' | 'confirmed' | 'posted'

export type OcrDraftRecord = {
  id: string
  companyId: string
  attachmentId: string
  status: OcrDraftStatus
  fields: OcrDraftFields
  lowConfidenceFields: Array<keyof OcrDraftFields>
  postedPurchaseBillId: string | null
  reviewedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OcrDraftRepository {
  create: (draft: OcrDraftRecord) => Promise<OcrDraftRecord>
  findById: (id: string) => Promise<OcrDraftRecord | null>
  save: (draft: OcrDraftRecord) => Promise<OcrDraftRecord>
  listByCompanyId: (companyId: string) => Promise<Array<OcrDraftRecord>>
}

const LOW_CONFIDENCE_THRESHOLD = 0.8

export async function createOcrDraft(
  repository: OcrDraftRepository,
  input: {
    companyId: string
    attachmentId: string
    fields: OcrDraftFields
  },
): Promise<OcrDraftRecord> {
  const lowConfidenceFields = (
    Object.entries(input.fields) as Array<[keyof OcrDraftFields, OcrFieldValue]>
  )
    .filter(([, field]) => field.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(([key]) => key)

  const now = new Date()

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    attachmentId: input.attachmentId,
    status: 'needs_review',
    fields: input.fields,
    lowConfidenceFields,
    postedPurchaseBillId: null,
    reviewedByUserId: null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function confirmOcrDraft(
  repository: OcrDraftRepository,
  input: { draftId: string; companyId: string; reviewedByUserId: string },
): Promise<OcrDraftRecord> {
  const draft = await repository.findById(input.draftId)

  if (!draft || draft.companyId !== input.companyId) {
    throw new Error('OCR draft not found for company')
  }

  return repository.save({
    ...draft,
    status: 'confirmed',
    reviewedByUserId: input.reviewedByUserId,
    updatedAt: new Date(),
  })
}

export async function listOcrDraftsByCompany(
  repository: OcrDraftRepository,
  companyId: string,
): Promise<Array<OcrDraftRecord>> {
  return repository.listByCompanyId(companyId)
}
