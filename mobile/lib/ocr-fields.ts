export function buildPlaceholderOcrFields() {
  const field = (value: string) => ({ value, confidence: 0.4 })
  return {
    supplierName: field(''),
    supplierGstin: field(''),
    billNumber: field(''),
    billDate: field(''),
    taxableAmount: field('0'),
    gstAmount: field('0'),
    totalAmount: field('0'),
  }
}
