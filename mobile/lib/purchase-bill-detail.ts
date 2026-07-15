export type PurchaseBillDetailLike = {
  supplierBillNumber: string
  billDate: string
  paymentStatus: string
  partyNameSnapshot?: string | null
  placeOfSupply: string
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  outstandingAmount: string
  lines: Array<{
    description: string
    quantity: string
    unit: string
    rate: string
    gstRate: string
    lineTotal: string
  }>
}

export function purchaseBillSummaryRows(bill: PurchaseBillDetailLike) {
  return [
    { label: 'Supplier', value: bill.partyNameSnapshot ?? '—' },
    { label: 'Date', value: bill.billDate },
    { label: 'Place of supply', value: bill.placeOfSupply },
    { label: 'Payment', value: bill.paymentStatus },
  ]
}

export function purchaseBillTotalsRows(bill: PurchaseBillDetailLike) {
  return [
    { label: 'Taxable', value: bill.taxableAmount },
    { label: 'GST', value: bill.totalGstAmount },
    { label: 'Total', value: bill.totalAmount },
    { label: 'Outstanding', value: bill.outstandingAmount },
  ]
}
