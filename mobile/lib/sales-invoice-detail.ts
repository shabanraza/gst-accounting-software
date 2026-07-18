export type SalesInvoiceDetailLike = {
  invoiceNumber: string
  invoiceDate: string
  paymentStatus: string
  status: string
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

export function salesInvoiceSummaryRows(invoice: SalesInvoiceDetailLike) {
  return [
    { label: 'Customer', value: invoice.partyNameSnapshot ?? '—' },
    { label: 'Date', value: invoice.invoiceDate },
    { label: 'Place of supply', value: invoice.placeOfSupply },
    { label: 'Payment', value: invoice.paymentStatus },
    { label: 'Status', value: invoice.status },
  ]
}

export function salesInvoiceTotalsRows(invoice: SalesInvoiceDetailLike) {
  return [
    { label: 'Taxable', value: invoice.taxableAmount },
    { label: 'GST', value: invoice.totalGstAmount },
    { label: 'Total', value: invoice.totalAmount },
    { label: 'Outstanding', value: invoice.outstandingAmount },
  ]
}
