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

function b2cInvoice(
  overrides: Partial<GstReportDocument>,
): GstReportDocument {
  return {
    ...outwardInvoice,
    partyGstin: null,
    partyName: 'Walk-in customer',
    ...overrides,
  }
}

describe('buildGstr1Report B2C sections', () => {
  const period = {
    companyId: 'company-1',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
  }

  test('puts inter-state unregistered invoices above ₹1 lakh in B2C large', () => {
    const large = b2cInvoice({
      id: 'inv-l',
      invoiceNumber: 'INV-L',
      placeOfSupply: '24',
      supplyType: 'inter_state',
      taxableAmount: '100000.00',
      cgstAmount: '0.00',
      sgstAmount: '0.00',
      igstAmount: '18000.00',
      totalGstAmount: '18000.00',
      totalAmount: '118000.00',
    })
    const report = buildGstr1Report({ ...period, documents: [large] })

    expect(report.b2b).toHaveLength(0)
    expect(report.b2cl.map((line) => line.invoiceNumber)).toEqual(['INV-L'])
    expect(report.b2cs).toHaveLength(0)
    expect(report.totalTaxableValue).toBe('100000.00')
  })

  test('uses the ₹2.5 lakh limit for invoices before August 2024', () => {
    const invoice = b2cInvoice({
      documentDate: '2024-07-15',
      placeOfSupply: '24',
      supplyType: 'inter_state',
      taxableAmount: '100000.00',
      cgstAmount: '0.00',
      sgstAmount: '0.00',
      igstAmount: '18000.00',
      totalGstAmount: '18000.00',
      totalAmount: '118000.00',
    })
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2024-07-01',
      periodEnd: '2024-07-31',
      documents: [invoice],
    })

    expect(report.b2cl).toHaveLength(0)
    expect(report.b2cs).toHaveLength(1)
  })

  test('groups other unregistered sales by place of supply and rate', () => {
    const mixed = b2cInvoice({
      id: 'inv-a',
      invoiceNumber: 'INV-A',
      taxableAmount: '1500.00',
      cgstAmount: '70.00',
      sgstAmount: '70.00',
      totalGstAmount: '140.00',
      totalAmount: '1640.00',
      rateLines: [
        { gstRate: '5.00', taxableAmount: '1000.00', gstAmount: '50.00' },
        { gstRate: '18.00', taxableAmount: '500.00', gstAmount: '90.00' },
      ],
    })
    const sameRate = b2cInvoice({
      id: 'inv-b',
      invoiceNumber: 'INV-B',
      taxableAmount: '200.00',
      cgstAmount: '5.00',
      sgstAmount: '5.00',
      totalGstAmount: '10.00',
      totalAmount: '210.00',
      rateLines: [
        { gstRate: '5.00', taxableAmount: '200.00', gstAmount: '10.00' },
      ],
    })
    const otherState = b2cInvoice({
      id: 'inv-c',
      invoiceNumber: 'INV-C',
      placeOfSupply: '24',
      supplyType: 'inter_state',
      taxableAmount: '400.00',
      cgstAmount: '0.00',
      sgstAmount: '0.00',
      igstAmount: '20.00',
      totalGstAmount: '20.00',
      totalAmount: '420.00',
      rateLines: [
        { gstRate: '5.00', taxableAmount: '400.00', gstAmount: '20.00' },
      ],
    })

    const report = buildGstr1Report({
      ...period,
      documents: [mixed, sameRate, otherState, purchaseBill],
    })

    expect(report.b2b).toHaveLength(0)
    expect(report.b2cl).toHaveLength(0)
    expect(report.b2cs).toEqual([
      {
        placeOfSupply: '24',
        supplyType: 'inter_state',
        gstRate: '5.00',
        taxableAmount: '400.00',
        cgstAmount: '0.00',
        sgstAmount: '0.00',
        igstAmount: '20.00',
      },
      {
        placeOfSupply: '27',
        supplyType: 'intra_state',
        gstRate: '5.00',
        taxableAmount: '1200.00',
        cgstAmount: '30.00',
        sgstAmount: '30.00',
        igstAmount: '0.00',
      },
      {
        placeOfSupply: '27',
        supplyType: 'intra_state',
        gstRate: '18.00',
        taxableAmount: '500.00',
        cgstAmount: '45.00',
        sgstAmount: '45.00',
        igstAmount: '0.00',
      },
    ])
    expect(report.totalTaxableValue).toBe('2100.00')
  })

  test('exports B2C large and small rows in the JSON', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [
        b2cInvoice({
          rateLines: [
            { gstRate: '5.00', taxableAmount: '2400.00', gstAmount: '120.00' },
          ],
        }),
      ],
    })

    const json = JSON.parse(buildGstr1Json(report))

    expect(json.b2cl).toEqual([])
    expect(json.b2cs).toEqual([
      {
        sply_ty: 'INTRA',
        pos: '27',
        rt: '5.00',
        txval: '2400.00',
        cgst: '60.00',
        sgst: '60.00',
        igst: '0.00',
      },
    ])
  })
})
