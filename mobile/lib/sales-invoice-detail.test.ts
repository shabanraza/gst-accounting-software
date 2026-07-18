import { describe, expect, it } from 'vitest'

import {
  salesInvoiceSummaryRows,
  salesInvoiceTotalsRows,
} from './sales-invoice-detail.ts'

const sampleInvoice = {
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-04-01',
  paymentStatus: 'Pending',
  status: 'posted',
  partyNameSnapshot: 'Acme Traders',
  placeOfSupply: '27',
  taxableAmount: '1000.00',
  totalGstAmount: '180.00',
  totalAmount: '1180.00',
  outstandingAmount: '1180.00',
  lines: [
    {
      description: 'Widget',
      quantity: '10',
      unit: 'pcs',
      rate: '100.00',
      gstRate: '18',
      lineTotal: '1000.00',
    },
  ],
}

describe('salesInvoiceSummaryRows', () => {
  it('maps header fields for the detail screen', () => {
    expect(salesInvoiceSummaryRows(sampleInvoice)).toEqual([
      { label: 'Customer', value: 'Acme Traders' },
      { label: 'Date', value: '2026-04-01' },
      { label: 'Place of supply', value: '27' },
      { label: 'Payment', value: 'Pending' },
      { label: 'Status', value: 'posted' },
    ])
  })
})

describe('salesInvoiceTotalsRows', () => {
  it('maps amount fields for the totals card', () => {
    expect(salesInvoiceTotalsRows(sampleInvoice)).toEqual([
      { label: 'Taxable', value: '1000.00' },
      { label: 'GST', value: '180.00' },
      { label: 'Total', value: '1180.00' },
      { label: 'Outstanding', value: '1180.00' },
    ])
  })
})
