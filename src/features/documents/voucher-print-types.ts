export type VoucherPrintPartyInfo = {
  name: string
  gstin: string | null
  stateCode: string
  pan?: string
  billingAddress?: string
  shippingAddress?: string
  contactPhone?: string
  contactEmail?: string
}

export type VoucherPrintCompanyInfo = {
  legalName: string
  tradeName: string
  gstin: string | null
  stateCode: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
  pan?: string
  contactPhone?: string
  contactEmail?: string
  bankName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  authorizedSignatory?: string
  logoUrl?: string
  invoiceTerms?: string
}

export type VoucherPrintLine = {
  serial: number
  description: string
  hsnCode: string
  quantity: string
  unit: string
  rate: string
  discountAmount: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  cgstRate: string
  cgstAmount: string
  sgstRate: string
  sgstAmount: string
  igstRate: string
  igstAmount: string
  lineTotal: string
}

export type VoucherPrintHsnRow = {
  hsnCode: string
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalTax: string
}

export type VoucherEInvoiceInfo = {
  irn: string
  ackNumber: string
  ackDate: string
  qrText: string
}

export type VoucherPrintDocument = {
  kind: 'sales' | 'purchase'
  title: string
  documentNumber: string
  documentDate: string
  dueDate?: string
  poReference?: string
  transportMode?: string
  vehicleNo?: string
  lrNumber?: string
  challanRef?: string
  paymentMode?: string
  narration: string
  company: VoucherPrintCompanyInfo
  party: VoucherPrintPartyInfo
  partyLabel: string
  placeOfSupplyLabel: string
  reverseCharge: boolean
  isInterState: boolean
  copyLabel: string
  lines: Array<VoucherPrintLine>
  hsnSummary: Array<VoucherPrintHsnRow>
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
  taxableAmount: string
  totalCgst: string
  totalSgst: string
  totalIgst: string
  totalGstAmount: string
  totalAmount: string
  amountInWords: string
  outstandingAmount: string
  eInvoice?: VoucherEInvoiceInfo
}
