import { describe, expect, test } from 'vitest'

import {
  buildGstr1Json,
  buildGstr1Report,
} from '#/features/gst/gstr1-report-service.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import type { GstReportDocument } from '#/features/gst/gst-report-types.ts'

const outwardInvoice: GstReportDocument = {
  id: 'inv-1',
  companyId: 'company-1',
  documentType: 'sales_invoice',
  documentDate: '2026-07-11',
  partyGstin: '27AABCU9603R1ZM',
  partyName: 'Noor Retailers',
  placeOfSupply: '27',
  supplyType: 'intra_state',
  taxableAmount: '2400.00',
  cgstAmount: '60.00',
  sgstAmount: '60.00',
  igstAmount: '0.00',
  totalGstAmount: '120.00',
  totalAmount: '2520.00',
  invoiceNumber: 'INV-1001',
}

const creditNote: GstReportDocument = {
  id: 'cn-1',
  companyId: 'company-1',
  documentType: 'credit_note',
  documentDate: '2026-07-12',
  partyGstin: '27AABCU9603R1ZM',
  partyName: 'Noor Retailers',
  placeOfSupply: '27',
  supplyType: 'intra_state',
  taxableAmount: '600.00',
  cgstAmount: '15.00',
  sgstAmount: '15.00',
  igstAmount: '0.00',
  totalGstAmount: '30.00',
  totalAmount: '630.00',
  invoiceNumber: 'CN-1001',
}

const purchaseBill: GstReportDocument = {
  id: 'bill-1',
  companyId: 'company-1',
  documentType: 'purchase_bill',
  documentDate: '2026-07-10',
  partyGstin: '24AABCU9603R1ZM',
  partyName: 'Textile Mills Ltd',
  placeOfSupply: '24',
  supplyType: 'inter_state',
  taxableAmount: '8000.00',
  cgstAmount: '0.00',
  sgstAmount: '0.00',
  igstAmount: '400.00',
  totalGstAmount: '400.00',
  totalAmount: '8400.00',
  invoiceNumber: 'SUP-1001',
}

describe('buildGstr1Report', () => {
  test('includes B2B invoice-level outward supplies', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [outwardInvoice, purchaseBill],
    })

    expect(report.b2b).toHaveLength(1)
    expect(report.b2b[0]?.invoiceNumber).toBe('INV-1001')
    expect(report.b2b[0]?.taxableAmount).toBe('2400.00')
    expect(report.b2b[0]?.partyGstin).toBe('27AABCU9603R1ZM')
    expect(report.totalTaxableValue).toBe('2400.00')
  })

  test('includes credit and debit notes', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [outwardInvoice, creditNote],
    })

    expect(report.creditDebitNotes).toHaveLength(1)
    expect(report.creditDebitNotes[0]?.invoiceNumber).toBe('CN-1001')
    expect(report.creditDebitNotes[0]?.taxableAmount).toBe('600.00')
    expect(report.totalTaxableValue).toBe('1800.00')
  })
})

describe('buildGstr1Json', () => {
  test('exports B2B and credit/debit note rows as GSTR-1 JSON', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [outwardInvoice, creditNote],
    })

    const json = JSON.parse(buildGstr1Json(report))

    expect(json.b2b).toHaveLength(1)
    expect(json.b2b[0].inum).toBe('INV-1001')
    expect(json.cdnr).toHaveLength(1)
    expect(json.cdnr[0].nt_num).toBe('CN-1001')
    expect(json.fp).toBe('072026')
  })
})

describe('buildGstr3bReport', () => {
  test('summarizes output GST and input GST', () => {
    const report = buildGstr3bReport({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [outwardInvoice, creditNote, purchaseBill],
    })

    expect(report.outwardTaxableValue).toBe('1800.00')
    expect(report.outputGst).toBe('90.00')
    expect(report.inputGst).toBe('400.00')
    expect(report.netGstPayable).toBe('-310.00')
  })
})
