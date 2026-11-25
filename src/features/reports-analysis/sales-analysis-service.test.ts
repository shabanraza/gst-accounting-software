import { describe, expect, test } from 'vitest'

import {
  buildInvoiceProfit,
  buildItemSales,
  buildPartySales,
} from '#/features/reports-analysis/sales-analysis-service.ts'

import type {
  SalesAnalysisData,
  SalesAnalysisInvoice,
} from '#/features/reports-analysis/sales-analysis-service.ts'

const PEN = 'item-pen'
const BOOK = 'item-book'
const SERVICE = 'item-service'

function invoice(
  overrides: Partial<SalesAnalysisInvoice> & { id: string },
): SalesAnalysisInvoice {
  return {
    invoiceNumber: overrides.id.toUpperCase(),
    invoiceDate: '2026-11-05',
    customerId: 'cust-a',
    customerName: 'Asha Traders',
    status: 'posted',
    totalAmount: '0.00',
    outstandingAmount: '0.00',
    lines: [],
    ...overrides,
  }
}

function baseData(overrides: Partial<SalesAnalysisData> = {}) {
  const data: SalesAnalysisData = {
    from: '2026-11-01',
    to: '2026-11-30',
    items: [
      { id: PEN, name: 'Pen' },
      { id: BOOK, name: 'Notebook' },
      { id: SERVICE, name: 'Delivery' },
    ],
    invoices: [
      invoice({
        id: 'inv-1',
        invoiceDate: '2026-11-05',
        totalAmount: '1180.00',
        outstandingAmount: '180.00',
        lines: [
          {
            itemId: PEN,
            description: 'Pen',
            quantity: '10',
            unit: 'pcs',
            taxableAmount: '500.00',
            gstAmount: '90.00',
          },
          {
            itemId: BOOK,
            description: 'Notebook',
            quantity: '5',
            unit: 'pcs',
            taxableAmount: '500.00',
            gstAmount: '90.00',
          },
        ],
      }),
      invoice({
        id: 'inv-2',
        invoiceDate: '2026-11-20',
        customerId: 'cust-b',
        customerName: 'Bharat Stores',
        totalAmount: '354.00',
        outstandingAmount: '0.00',
        lines: [
          {
            itemId: PEN,
            description: 'Pen',
            quantity: '4',
            unit: 'pcs',
            taxableAmount: '200.00',
            gstAmount: '36.00',
          },
          {
            itemId: SERVICE,
            description: 'Delivery',
            quantity: '1',
            unit: 'job',
            taxableAmount: '100.00',
            gstAmount: '18.00',
          },
        ],
      }),
    ],
    saleMovements: [
      { referenceId: 'inv-1', itemId: PEN, quantity: '10', value: '300.00' },
      { referenceId: 'inv-1', itemId: BOOK, quantity: '5', value: '350.00' },
      { referenceId: 'inv-2', itemId: PEN, quantity: '4', value: '128.00' },
    ],
    creditNotes: [],
    returnMovements: [],
    ...overrides,
  }
  return data
}

describe('buildItemSales', () => {
  test('takes cost of goods sold from the stock movement values, not current rates', () => {
    const report = buildItemSales(baseData())

    const pen = report.rows.find((row) => row.itemId === PEN)
    expect(pen).toMatchObject({
      itemName: 'Pen',
      soldQuantity: '14',
      returnedQuantity: '0',
      netQuantity: '14',
      unit: 'pcs',
      taxableAmount: '700.00',
      gstAmount: '126.00',
      costAmount: '428.00',
      profitAmount: '272.00',
      marginPercent: '38.86',
    })
  })

  test('items that do not track stock have zero cost', () => {
    const report = buildItemSales(baseData())

    const delivery = report.rows.find((row) => row.itemId === SERVICE)
    expect(delivery).toMatchObject({
      taxableAmount: '100.00',
      costAmount: '0.00',
      profitAmount: '100.00',
      marginPercent: '100.00',
    })
  })

  test('sales returns reduce quantity, taxable value, GST and cost', () => {
    const report = buildItemSales(
      baseData({
        creditNotes: [
          {
            id: 'cn-1',
            noteDate: '2026-11-10',
            referenceDocumentId: 'inv-1',
            taxableAmount: '100.00',
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            createdAt: new Date('2026-11-10T10:00:01Z'),
          },
        ],
        returnMovements: [
          {
            referenceId: 'ret-1',
            itemId: PEN,
            quantity: '2',
            value: '60.00',
            occurredOn: '2026-11-10',
            createdAt: new Date('2026-11-10T10:00:00Z'),
          },
        ],
      }),
    )

    const pen = report.rows.find((row) => row.itemId === PEN)
    expect(pen).toMatchObject({
      soldQuantity: '14',
      returnedQuantity: '2',
      netQuantity: '12',
      taxableAmount: '600.00',
      gstAmount: '108.00',
      costAmount: '368.00',
      profitAmount: '232.00',
    })
    const book = report.rows.find((row) => row.itemId === BOOK)
    expect(book).toMatchObject({
      taxableAmount: '500.00',
      costAmount: '350.00',
    })
  })

  test('a credit note without returned stock is spread over the invoice lines', () => {
    const report = buildItemSales(
      baseData({
        creditNotes: [
          {
            id: 'cn-1',
            noteDate: '2026-11-10',
            referenceDocumentId: 'inv-1',
            taxableAmount: '100.00',
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            createdAt: new Date('2026-11-10T10:00:01Z'),
          },
        ],
      }),
    )

    expect(report.rows.find((row) => row.itemId === BOOK)).toMatchObject({
      taxableAmount: '450.00',
      gstAmount: '81.00',
      costAmount: '350.00',
    })
    expect(report.totals.taxableAmount).toBe('1200.00')
  })

  test('cancelled invoices are excluded', () => {
    const data = baseData()
    data.invoices[1] = { ...data.invoices[1], status: 'cancelled' }

    const report = buildItemSales(data)

    expect(report.rows.map((row) => row.itemId).sort()).toEqual([BOOK, PEN])
    expect(report.rows.find((row) => row.itemId === PEN)).toMatchObject({
      soldQuantity: '10',
      costAmount: '300.00',
    })
  })

  test('only invoices and returns inside the period count', () => {
    const data = baseData({
      from: '2026-11-06',
      to: '2026-11-30',
      creditNotes: [
        {
          id: 'cn-late',
          noteDate: '2026-12-01',
          referenceDocumentId: 'inv-2',
          taxableAmount: '50.00',
          totalGstAmount: '9.00',
          totalAmount: '59.00',
          createdAt: new Date('2026-12-01T10:00:01Z'),
        },
      ],
    })

    const report = buildItemSales(data)

    expect(report.rows.find((row) => row.itemId === PEN)).toMatchObject({
      soldQuantity: '4',
      taxableAmount: '200.00',
    })
    expect(report.totals.taxableAmount).toBe('300.00')
  })

  test('totals add up the rows', () => {
    const report = buildItemSales(baseData())

    expect(report.totals).toMatchObject({
      taxableAmount: '1300.00',
      gstAmount: '234.00',
      costAmount: '778.00',
      profitAmount: '522.00',
      marginPercent: '40.15',
    })
  })
})

describe('buildInvoiceProfit', () => {
  test('profit per invoice is net sales value minus net cost', () => {
    const report = buildInvoiceProfit(
      baseData({
        creditNotes: [
          {
            id: 'cn-1',
            noteDate: '2026-11-10',
            referenceDocumentId: 'inv-1',
            taxableAmount: '100.00',
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            createdAt: new Date('2026-11-10T10:00:01Z'),
          },
        ],
        returnMovements: [
          {
            referenceId: 'ret-1',
            itemId: PEN,
            quantity: '2',
            value: '60.00',
            occurredOn: '2026-11-10',
            createdAt: new Date('2026-11-10T10:00:00Z'),
          },
        ],
      }),
    )

    expect(report.rows.find((row) => row.invoiceId === 'inv-1')).toMatchObject({
      invoiceNumber: 'INV-1',
      customerName: 'Asha Traders',
      taxableAmount: '900.00',
      returnedAmount: '100.00',
      costAmount: '590.00',
      profitAmount: '310.00',
      marginPercent: '34.44',
    })
    expect(report.totals).toMatchObject({
      taxableAmount: '1200.00',
      costAmount: '718.00',
      profitAmount: '482.00',
    })
  })

  test('returns are matched to the credit note posted with them', () => {
    const report = buildInvoiceProfit(
      baseData({
        creditNotes: [
          {
            id: 'cn-2',
            noteDate: '2026-11-21',
            referenceDocumentId: 'inv-2',
            taxableAmount: '50.00',
            totalGstAmount: '9.00',
            totalAmount: '59.00',
            createdAt: new Date('2026-11-21T09:00:01Z'),
          },
          {
            id: 'cn-1',
            noteDate: '2026-11-21',
            referenceDocumentId: 'inv-1',
            taxableAmount: '100.00',
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            createdAt: new Date('2026-11-21T15:00:01Z'),
          },
        ],
        returnMovements: [
          {
            referenceId: 'ret-1',
            itemId: BOOK,
            quantity: '1',
            value: '70.00',
            occurredOn: '2026-11-21',
            createdAt: new Date('2026-11-21T15:00:00Z'),
          },
          {
            referenceId: 'ret-2',
            itemId: PEN,
            quantity: '1',
            value: '32.00',
            occurredOn: '2026-11-21',
            createdAt: new Date('2026-11-21T09:00:00Z'),
          },
        ],
      }),
    )

    expect(
      report.rows.find((row) => row.invoiceId === 'inv-1')?.costAmount,
    ).toBe('580.00')
    expect(
      report.rows.find((row) => row.invoiceId === 'inv-2')?.costAmount,
    ).toBe('96.00')
  })
})

describe('buildPartySales', () => {
  test('party totals reconcile with the sum of their invoices', () => {
    const data = baseData()
    data.invoices.push(
      invoice({
        id: 'inv-3',
        invoiceDate: '2026-11-25',
        totalAmount: '118.00',
        outstandingAmount: '118.00',
        lines: [
          {
            itemId: SERVICE,
            description: 'Delivery',
            quantity: '1',
            unit: 'job',
            taxableAmount: '100.00',
            gstAmount: '18.00',
          },
        ],
      }),
    )
    data.creditNotes.push({
      id: 'cn-1',
      noteDate: '2026-11-10',
      referenceDocumentId: 'inv-1',
      taxableAmount: '100.00',
      totalGstAmount: '18.00',
      totalAmount: '118.00',
      createdAt: new Date('2026-11-10T10:00:01Z'),
    })

    const report = buildPartySales(data)
    const invoices = buildInvoiceProfit(data)

    expect(report.rows.find((row) => row.customerId === 'cust-a')).toEqual({
      customerId: 'cust-a',
      customerName: 'Asha Traders',
      invoiceCount: 2,
      taxableAmount: '1000.00',
      gstAmount: '180.00',
      returnedAmount: '118.00',
      totalAmount: '1180.00',
      outstandingAmount: '298.00',
    })
    expect(report.totals.taxableAmount).toBe(invoices.totals.taxableAmount)
    expect(report.totals.invoiceCount).toBe(3)
  })
})
