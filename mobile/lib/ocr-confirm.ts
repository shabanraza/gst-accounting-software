export type OcrDraftFieldsLike = {
  supplierName: { value: string; confidence: number }
  supplierGstin: { value: string; confidence: number }
  billNumber: { value: string; confidence: number }
  billDate: { value: string; confidence: number }
  taxableAmount: { value: string; confidence: number }
  gstAmount: { value: string; confidence: number }
  totalAmount: { value: string; confidence: number }
}

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

export function ocrDraftSummaryRows(draft: OcrDraftLike) {
  return [
    { label: 'Supplier', value: draft.fields.supplierName.value || '—' },
    { label: 'GSTIN', value: draft.fields.supplierGstin.value || 'Unregistered' },
    { label: 'Bill number', value: draft.fields.billNumber.value || '—' },
    { label: 'Bill date', value: draft.fields.billDate.value || '—' },
    { label: 'Taxable', value: draft.fields.taxableAmount.value || '0' },
    { label: 'GST', value: draft.fields.gstAmount.value || '0' },
    { label: 'Total', value: draft.fields.totalAmount.value || '0' },
  ]
}
