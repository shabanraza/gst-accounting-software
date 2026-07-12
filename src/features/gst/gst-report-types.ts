export type GstReportDocumentType =
  'sales_invoice' | 'purchase_bill' | 'credit_note' | 'debit_note'

export type GstReportDocument = {
  id: string
  companyId: string
  documentType: GstReportDocumentType
  documentDate: string
  partyGstin: string | null
  partyName: string
  placeOfSupply: string
  supplyType: 'intra_state' | 'inter_state'
  taxableAmount: string
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  totalGstAmount: string
  totalAmount: string
  invoiceNumber: string
}

export type GstReportPeriodInput = {
  companyId: string
  periodStart: string
  periodEnd: string
  documents: Array<GstReportDocument>
}
