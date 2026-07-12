import { describe, expect, test } from 'vitest'

import { buildInvoicePrintDocument } from '#/features/sales/invoice-print-service.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

function makeInvoice(): SalesInvoiceRecord {
  return {
    id: 'invoice-1',
    companyId: 'company-1',
    customerId: 'party-1',
    invoiceNumber: 'INV-1001',
    invoiceDate: '2026-07-11',
    placeOfSupply: '27',
    reverseCharge: false,
    paymentMode: 'credit',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    status: 'posted',
    taxableAmount: '2400.00',
    totalGstAmount: '120.00',
    totalAmount: '2520.00',
    outstandingAmount: '2520.00',
    ledgerEntryId: 'entry-1',
    lines: [
      {
        id: 'line-1',
        itemId: 'item-1',
        description: 'Cotton Fabric',
        quantity: '20',
        unit: 'meter',
        rate: '120.00',
        gstRate: '5.00',
        discountPercent: '0.00',
        discountAmount: '0.00',
        taxableAmount: '2400.00',
        gstAmount: '120.00',
        lineTotal: '2520.00',
        godownName: null,
      },
    ],
    createdAt: new Date('2026-07-11'),
  }
}

const item: ItemRecord = {
  id: 'item-1',
  companyId: 'company-1',
  name: 'Cotton Fabric',
  alias: '',
  itemGroup: '',
  hsnCode: '5208',
  gstRate: '5.00',
  baseUnit: 'meter',
  alternateUnit: '',
  conversionFactor: '1',
  mrp: '0.00',
  reorderLevel: '0',
  purchaseRate: '80.00',
  saleRate: '120.00',
  tracksInventory: true,
  createdAt: new Date('2026-01-01'),
}

describe('buildInvoicePrintDocument', () => {
  test('shapes invoice, party, and item data for printing', () => {
    const document = buildInvoicePrintDocument({
      invoice: makeInvoice(),
      company: {
        legalName: 'Demo Textiles Private Limited',
        tradeName: 'Demo Textiles',
        gstin: '27AAAAA0000A1Z5',
        stateCode: '27',
      },
      customer: {
        name: 'Noor Retailers',
        gstin: '27AABCU9603R1ZM',
        stateCode: '27',
      },
      itemById: new Map([[item.id, item]]),
    })

    expect(document.documentNumber).toBe('INV-1001')
    expect(document.party.name).toBe('Noor Retailers')
    expect(document.lines).toHaveLength(1)
    expect(document.lines[0]?.hsnCode).toBe('5208')
    expect(document.lines[0]?.lineTotal).toBe('2520.00')
    expect(document.totalAmount).toBe('2520.00')
    expect(document.isInterState).toBe(false)
    expect(document.lines[0]?.cgstAmount).toBe('60.00')
    expect(document.lines[0]?.sgstAmount).toBe('60.00')
    expect(document.totalCgst).toBe('60.00')
    expect(document.amountInWords).toBe(
      'Two Thousand Five Hundred Twenty Rupees Only',
    )
  })

  test('falls back to empty HSN when item is missing from the map', () => {
    const document = buildInvoicePrintDocument({
      invoice: makeInvoice(),
      company: {
        legalName: 'Demo Textiles Private Limited',
        tradeName: 'Demo Textiles',
        gstin: null,
        stateCode: '27',
      },
      customer: { name: 'Noor Retailers', gstin: null, stateCode: '27' },
      itemById: new Map(),
    })

    expect(document.lines[0]?.hsnCode).toBe('')
  })
})
