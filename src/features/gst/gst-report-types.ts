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
  /** Taxable value and GST per rate; set for sales invoices and credit notes. */
  rateLines?: Array<GstRateLine>
  /** Sales invoice lines for the GSTR-1 HSN summary (Table 12). */
  hsnLines?: Array<GstHsnLine>
  reverseCharge?: boolean
  /** For credit and debit notes: the invoice or bill the note was issued against. */
  originalInvoice?: {
    invoiceNumber: string
    documentDate: string
    totalAmount: string
  }
}

export type GstReportPeriodInput = {
  companyId: string
  periodStart: string
  periodEnd: string
  documents: Array<GstReportDocument>
}

export type GstHsnLine = GstRateLine & {
  hsnCode: string
  description: string
  /** GSTN unit quantity code; `NA` for services. */
  uqc: string
  quantity: string
}

export type GstRateLine = {
  gstRate: string
  taxableAmount: string
  gstAmount: string
}
