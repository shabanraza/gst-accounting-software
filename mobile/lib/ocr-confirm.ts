import type { OcrFieldsDraft } from './ocr-fields.ts'

export type OcrDraftFieldsLike = OcrFieldsDraft

export type OcrDraftLike = {
  id: string
  status: string
  fields: OcrDraftFieldsLike
  lowConfidenceFields: Array<string>
}

export type WorkspaceCompanyLike = {
  stateCode: string
  financialYearStart: string
}

const REQUIRED_LEDGER_KEYS = [
  'purchase',
  'input_gst',
  'supplier_payable',
  'stock_in_hand',
] as const

const LOW_CONFIDENCE_THRESHOLD = 0.8

const REQUIRED_FIELD_KEYS = [
  'supplierName',
  'billNumber',
  'billDate',
  'totalAmount',
] as const

function parsePositiveAmount(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function computeLowConfidenceFields(fields: OcrDraftFieldsLike) {
  return (
    Object.entries(fields) as Array<[keyof OcrDraftFieldsLike, OcrFieldDraft]>
  )
    .filter(([, field]) => field.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(([key]) => key)
}

type OcrFieldDraft = { value: string; confidence: number }

export function isOcrDraftConfirmable(draft: OcrDraftLike) {
  return draft.status !== 'posted'
}

export function validateOcrConfirmLedgers(
  ledgerBySystemKey: Partial<Record<string, string>>,
) {
  const missing = REQUIRED_LEDGER_KEYS.filter((key) => !ledgerBySystemKey[key])

  if (missing.length > 0) {
    return 'Ledger mappings required before posting OCR bills.'
  }

  return null
}

export function validateOcrDraftFields(fields: OcrDraftFieldsLike) {
  if (!fields.supplierName.value.trim()) {
    return 'Supplier name is required.'
  }

  if (!fields.billNumber.value.trim()) {
    return 'Bill number is required.'
  }

  if (!fields.billDate.value.trim()) {
    return 'Bill date is required.'
  }

  if (!parsePositiveAmount(fields.totalAmount.value)) {
    return 'Total amount must be greater than zero.'
  }

  const lowConfidenceFields = computeLowConfidenceFields(fields)
  const blockingLowConfidence = lowConfidenceFields.filter((field) =>
    (REQUIRED_FIELD_KEYS as ReadonlyArray<string>).includes(field),
  )

  if (blockingLowConfidence.length > 0) {
    return 'Review low-confidence fields before confirming.'
  }

  return null
}

export function buildOcrConfirmInput(input: {
  companyId: string
  draftId: string
  company: WorkspaceCompanyLike
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  return {
    companyId: input.companyId,
    draftId: input.draftId,
    companyStateCode: input.company.stateCode,
    financialYearStart: input.company.financialYearStart,
    purchaseAccountId: input.ledgerBySystemKey.purchase!,
    inputGstAccountId: input.ledgerBySystemKey.input_gst!,
    payableAccountId: input.ledgerBySystemKey.supplier_payable!,
    stockAccountId: input.ledgerBySystemKey.stock_in_hand!,
  }
}

export function buildOcrUpdateDraftInput(input: {
  companyId: string
  draftId: string
  fields: OcrDraftFieldsLike
}) {
  return {
    companyId: input.companyId,
    draftId: input.draftId,
    fields: input.fields,
  }
}

export function ocrDraftSummaryRows(fields: OcrDraftFieldsLike) {
  return [
    { label: 'Supplier', value: fields.supplierName.value || '—' },
    { label: 'GSTIN', value: fields.supplierGstin.value || 'Unregistered' },
    { label: 'Bill number', value: fields.billNumber.value || '—' },
    { label: 'Bill date', value: fields.billDate.value || '—' },
    { label: 'Taxable', value: fields.taxableAmount.value || '0' },
    { label: 'GST', value: fields.gstAmount.value || '0' },
    { label: 'Total', value: fields.totalAmount.value || '0' },
  ]
}
