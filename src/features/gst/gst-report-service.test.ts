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

  test('puts credit notes to registered customers in CDNR', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [outwardInvoice, creditNote],
    })

    expect(report.cdnr).toHaveLength(1)
    expect(report.cdnr[0]?.invoiceNumber).toBe('CN-1001')
    expect(report.cdnr[0]?.taxableAmount).toBe('600.00')
    expect(report.cdnur).toHaveLength(0)
    expect(report.totalTaxableValue).toBe('1800.00')
  })

  test('leaves purchase debit notes out of GSTR-1', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [
        outwardInvoice,
        { ...creditNote, id: 'dn-1', documentType: 'debit_note' },
      ],
    })

    expect(report.cdnr).toHaveLength(0)
    expect(report.cdnur).toHaveLength(0)
    expect(report.totalTaxableValue).toBe('2400.00')
  })

  test('splits B2B invoices by GST rate', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [
        {
          ...outwardInvoice,
          rateLines: [
            { gstRate: '5.00', taxableAmount: '2000.00', gstAmount: '100.00' },
            { gstRate: '12.00', taxableAmount: '400.00', gstAmount: '20.00' },
          ],
        },
      ],
    })

    expect(report.b2b[0]?.rates).toEqual([
      {
        gstRate: '5.00',
        taxableAmount: '2000.00',
        cgstAmount: '50.00',
        sgstAmount: '50.00',
        igstAmount: '0.00',
      },
      {
        gstRate: '12.00',
        taxableAmount: '400.00',
        cgstAmount: '10.00',
        sgstAmount: '10.00',
        igstAmount: '0.00',
      },
    ])
  })
})

describe('buildGstr1Json', () => {
  test('exports B2B invoices and credit notes in the GSTN layout', () => {
    const report = buildGstr1Report({
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents: [
        {
          ...outwardInvoice,
          rateLines: [
            { gstRate: '5.00', taxableAmount: '2000.00', gstAmount: '100.00' },
            { gstRate: '1.00', taxableAmount: '400.00', gstAmount: '20.00' },
          ],
        },
        creditNote,
      ],
    })

    const json = JSON.parse(buildGstr1Json(report, '27ABCDE1234F1Z5'))

    expect(json.gstin).toBe('27ABCDE1234F1Z5')
    expect(json.fp).toBe('072026')
    expect(json.b2b).toEqual([
      {
        ctin: '27AABCU9603R1ZM',
        inv: [
          {
            inum: 'INV-1001',
            idt: '11-07-2026',
            val: 2520,
            pos: '27',
            rchrg: 'N',
            inv_typ: 'R',
            itms: [
              {
                num: 1,
                itm_det: {
                  rt: 5,
                  txval: 2000,
                  iamt: 0,
                  camt: 50,
                  samt: 50,
                  csamt: 0,
                },
              },
              {
                num: 2,
                itm_det: {
                  rt: 1,
                  txval: 400,
                  iamt: 0,
                  camt: 10,
                  samt: 10,
                  csamt: 0,
                },
              },
            ],
          },
        ],
      },
    ])
    expect(json.cdnr).toEqual([
      {
        ctin: '27AABCU9603R1ZM',
        nt: [
          {
            ntty: 'C',
            nt_num: 'CN-1001',
            nt_dt: '12-07-2026',
            pos: '27',
            rchrg: 'N',
            inv_typ: 'R',
            val: 630,
            itms: [
              {
                num: 1,
                itm_det: {
                  rt: 5,
                  txval: 600,
                  iamt: 0,
                  camt: 15,
                  samt: 15,
                  csamt: 0,
                },
              },
            ],
          },
        ],
      },
    ])
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

function b2cInvoice(overrides: Partial<GstReportDocument>): GstReportDocument {
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

  test('puts credit notes against B2C large invoices in CDNUR', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [
        b2cInvoice({
          id: 'cn-l',
          documentType: 'credit_note',
          invoiceNumber: 'CN-L',
          placeOfSupply: '24',
          supplyType: 'inter_state',
          taxableAmount: '1000.00',
          cgstAmount: '0.00',
          sgstAmount: '0.00',
          igstAmount: '180.00',
          totalGstAmount: '180.00',
          totalAmount: '1180.00',
          originalInvoice: {
            invoiceNumber: 'INV-L',
            documentDate: '2026-06-20',
            totalAmount: '118000.00',
          },
        }),
      ],
    })

    expect(report.cdnur.map((line) => line.invoiceNumber)).toEqual(['CN-L'])
    expect(report.cdnr).toHaveLength(0)
    expect(report.b2cs).toHaveLength(0)
    expect(report.totalTaxableValue).toBe('-1000.00')
  })

  test('nets other credit notes to unregistered customers into B2C small', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [
        b2cInvoice({
          rateLines: [
            { gstRate: '5.00', taxableAmount: '2400.00', gstAmount: '120.00' },
          ],
        }),
        b2cInvoice({
          id: 'cn-s',
          documentType: 'credit_note',
          invoiceNumber: 'CN-S',
          taxableAmount: '400.00',
          cgstAmount: '10.00',
          sgstAmount: '10.00',
          totalGstAmount: '20.00',
          totalAmount: '420.00',
          rateLines: [
            { gstRate: '5.00', taxableAmount: '400.00', gstAmount: '20.00' },
          ],
          originalInvoice: {
            invoiceNumber: 'INV-1001',
            documentDate: '2026-07-11',
            totalAmount: '2520.00',
          },
        }),
      ],
    })

    expect(report.cdnur).toHaveLength(0)
    expect(report.b2cs).toEqual([
      {
        placeOfSupply: '27',
        supplyType: 'intra_state',
        gstRate: '5.00',
        taxableAmount: '2000.00',
        cgstAmount: '50.00',
        sgstAmount: '50.00',
        igstAmount: '0.00',
      },
    ])
    expect(report.totalTaxableValue).toBe('2000.00')
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
        b2cInvoice({
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
          rateLines: [
            {
              gstRate: '18.00',
              taxableAmount: '100000.00',
              gstAmount: '18000.00',
            },
          ],
        }),
        b2cInvoice({
          id: 'cn-l',
          documentType: 'credit_note',
          invoiceNumber: 'CN-L',
          placeOfSupply: '24',
          supplyType: 'inter_state',
          taxableAmount: '1000.00',
          cgstAmount: '0.00',
          sgstAmount: '0.00',
          igstAmount: '180.00',
          totalGstAmount: '180.00',
          totalAmount: '1180.00',
          originalInvoice: {
            invoiceNumber: 'INV-L',
            documentDate: '2026-07-11',
            totalAmount: '118000.00',
          },
        }),
      ],
    })

    const json = JSON.parse(buildGstr1Json(report, '27ABCDE1234F1Z5'))

    expect(json.b2cl).toEqual([
      {
        pos: '24',
        inv: [
          {
            inum: 'INV-L',
            idt: '11-07-2026',
            val: 118000,
            itms: [
              {
                num: 1,
                itm_det: { rt: 18, txval: 100000, iamt: 18000, csamt: 0 },
              },
            ],
          },
        ],
      },
    ])
    expect(json.b2cs).toEqual([
      {
        sply_ty: 'INTRA',
        pos: '27',
        typ: 'OE',
        rt: 5,
        txval: 2400,
        iamt: 0,
        camt: 60,
        samt: 60,
        csamt: 0,
      },
    ])
    expect(json.cdnur).toEqual([
      {
        typ: 'B2CL',
        ntty: 'C',
        nt_num: 'CN-L',
        nt_dt: '11-07-2026',
        pos: '24',
        val: 1180,
        itms: [
          {
            num: 1,
            itm_det: { rt: 18, txval: 1000, iamt: 180, csamt: 0 },
          },
        ],
      },
    ])
  })
})

describe('buildGstr1Report HSN summary and documents issued', () => {
  const period = {
    companyId: 'company-1',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
  }
  const shirts = {
    hsnCode: '6105',
    description: 'Cotton shirt',
    uqc: 'PCS',
    gstRate: '5.00',
  }

  const b2bInvoice: GstReportDocument = {
    ...outwardInvoice,
    hsnLines: [
      {
        ...shirts,
        quantity: '10',
        taxableAmount: '2000.00',
        gstAmount: '100.00',
      },
      {
        hsnCode: '998898',
        description: 'Stitching',
        uqc: 'NA',
        quantity: '0',
        gstRate: '18.00',
        taxableAmount: '400.00',
        gstAmount: '72.00',
      },
    ],
  }
  const b2cIntra: GstReportDocument = {
    ...outwardInvoice,
    id: 'inv-2',
    invoiceNumber: 'INV-1002',
    partyGstin: null,
    partyName: 'Walk-in',
    hsnLines: [
      { ...shirts, quantity: '2', taxableAmount: '400.00', gstAmount: '20.00' },
    ],
  }
  const b2cInter: GstReportDocument = {
    ...b2cIntra,
    id: 'inv-3',
    invoiceNumber: 'INV-1004',
    placeOfSupply: '24',
    supplyType: 'inter_state',
    hsnLines: [
      { ...shirts, quantity: '3', taxableAmount: '600.00', gstAmount: '30.00' },
    ],
  }
  const nextMonth: GstReportDocument = {
    ...b2cIntra,
    id: 'inv-4',
    invoiceNumber: 'INV-1005',
    documentDate: '2026-08-01',
  }
  const cancelled = (invoiceNumber: string, documentDate: string) => ({
    companyId: 'company-1',
    invoiceNumber,
    documentDate,
  })

  test('summarises HSN by code, unit and rate, split into B2B and B2C', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [b2bInvoice, b2cIntra, b2cInter, nextMonth, creditNote],
    })

    expect(report.hsnB2b).toEqual([
      {
        hsnCode: '6105',
        description: 'Cotton shirt',
        uqc: 'PCS',
        quantity: '10.00',
        gstRate: '5.00',
        taxableAmount: '2000.00',
        igstAmount: '0.00',
        cgstAmount: '50.00',
        sgstAmount: '50.00',
      },
      {
        hsnCode: '998898',
        description: 'Stitching',
        uqc: 'NA',
        quantity: '0.00',
        gstRate: '18.00',
        taxableAmount: '400.00',
        igstAmount: '0.00',
        cgstAmount: '36.00',
        sgstAmount: '36.00',
      },
    ])
    expect(report.hsnB2c).toEqual([
      {
        hsnCode: '6105',
        description: 'Cotton shirt',
        uqc: 'PCS',
        quantity: '5.00',
        gstRate: '5.00',
        taxableAmount: '1000.00',
        igstAmount: '30.00',
        cgstAmount: '10.00',
        sgstAmount: '10.00',
      },
    ])
  })

  test('lists documents issued per series, counting cancelled invoices', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [b2bInvoice, b2cIntra, b2cInter, nextMonth, creditNote],
      cancelledInvoices: [
        cancelled('INV-1003', '2026-07-15'),
        cancelled('TAX-0001', '2026-07-16'),
        cancelled('INV-0999', '2026-06-30'),
      ],
    })

    expect(report.documentsIssued).toEqual([
      {
        documentType: 'invoice',
        series: 'INV',
        from: 'INV-1001',
        to: 'INV-1004',
        total: 4,
        cancelled: 1,
      },
      {
        documentType: 'invoice',
        series: 'TAX',
        from: 'TAX-0001',
        to: 'TAX-0001',
        total: 1,
        cancelled: 1,
      },
      {
        documentType: 'credit_note',
        series: 'CN',
        from: 'CN-1001',
        to: 'CN-1001',
        total: 1,
        cancelled: 0,
      },
    ])
  })

  test('exports Table 12 and Table 13 in the GSTN layout', () => {
    const report = buildGstr1Report({
      ...period,
      documents: [b2bInvoice, b2cInter, creditNote],
      cancelledInvoices: [cancelled('INV-1003', '2026-07-15')],
    })

    const json = JSON.parse(buildGstr1Json(report, '27ABCDE1234F1Z5'))

    expect(json.hsn).toEqual({
      hsn_b2b: [
        {
          num: 1,
          hsn_sc: '6105',
          desc: 'Cotton shirt',
          uqc: 'PCS',
          qty: 10,
          rt: 5,
          txval: 2000,
          iamt: 0,
          camt: 50,
          samt: 50,
          csamt: 0,
        },
        {
          num: 2,
          hsn_sc: '998898',
          desc: 'Stitching',
          uqc: 'NA',
          qty: 0,
          rt: 18,
          txval: 400,
          iamt: 0,
          camt: 36,
          samt: 36,
          csamt: 0,
        },
      ],
      hsn_b2c: [
        {
          num: 1,
          hsn_sc: '6105',
          desc: 'Cotton shirt',
          uqc: 'PCS',
          qty: 3,
          rt: 5,
          txval: 600,
          iamt: 30,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
      ],
    })
    expect(json.doc_issue).toEqual({
      doc_det: [
        {
          doc_num: 1,
          docs: [
            {
              num: 1,
              from: 'INV-1001',
              to: 'INV-1004',
              totnum: 3,
              cancel: 1,
              net_issue: 2,
            },
          ],
        },
        {
          doc_num: 5,
          docs: [
            {
              num: 1,
              from: 'CN-1001',
              to: 'CN-1001',
              totnum: 1,
              cancel: 0,
              net_issue: 1,
            },
          ],
        },
      ],
    })
  })
})
