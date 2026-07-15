export type OcrFieldDraft = {
  value: string
  confidence: number
}

export type OcrFieldsDraft = {
  supplierName: OcrFieldDraft
  supplierGstin: OcrFieldDraft
  billNumber: OcrFieldDraft
  billDate: OcrFieldDraft
  taxableAmount: OcrFieldDraft
  gstAmount: OcrFieldDraft
  totalAmount: OcrFieldDraft
}

export function buildEmptyOcrFields(): OcrFieldsDraft {
  const field = (value = '') => ({ value, confidence: 0 })
  return {
    supplierName: field(),
    supplierGstin: field(),
    billNumber: field(),
    billDate: field(),
    taxableAmount: field('0'),
    gstAmount: field('0'),
    totalAmount: field('0'),
  }
}

export function withEditedOcrField(
  field: OcrFieldDraft,
  value: string,
): OcrFieldDraft {
  return { value, confidence: 1 }
}
