import { describe, expect, test } from 'vitest'

import { buildPurchaseBillPrintDocument } from '#/features/purchases/purchase-bill-print-service.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'

function makeBill(): PurchaseBillRecord {
  return {
    id: 'bill-1',
    companyId: 'company-1',
    financialYearStart: '2026-04-01',
    supplierId: 'party-1',
    supplierBillNumber: 'SUP-1001',
    billDate: '2026-07-11',
    dueDate: '2026-07-26',
    placeOfSupply: '24',
    reverseCharge: false,
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: 'Freight prepaid',
    freight: '50.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: 'Main Godown',
    taxableAmount: '8000.00',
    totalGstAmount: '400.00',
    totalAmount: '8450.00',
    outstandingAmount: '8450.00',
    ledgerEntryId: 'entry-1',
    lines: [
      {
        id: 'line-1',
        itemId: 'item-1',
        description: 'Cotton Fabric',
        quantity: '100',
        unit: 'meter',
        rate: '80.00',
        gstRate: '5.00',
        discountPercent: '0.00',
        discountAmount: '0.00',
        taxableAmount: '8000.00',
        gstAmount: '400.00',
        lineTotal: '8400.00',
        godownName: 'Main Godown',
      },
    ],
    createdAt: new Date('2026-07-11'),
  }
}

describe('buildPurchaseBillPrintDocument', () => {
  test('shapes purchase bill for preview and print', () => {
    const document = buildPurchaseBillPrintDocument({
      bill: makeBill(),
      company: {
        legalName: 'Demo Textiles Private Limited',
        tradeName: 'Demo Textiles',
        gstin: '27AAAAA0000A1Z5',
        stateCode: '27',
      },
      supplier: {
        name: 'Textile Mills Ltd',
        gstin: '24AABCU9603R1ZM',
        stateCode: '24',
      },
      itemById: new Map([
        [
          'item-1',
          {
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
          } satisfies ItemRecord,
        ],
      ]),
    })

    expect(document.kind).toBe('purchase')
    expect(document.title).toBe('Purchase Bill')
    expect(document.documentNumber).toBe('SUP-1001')
    expect(document.dueDate).toBe('2026-07-26')
    expect(document.partyLabel).toBe('Supplier')
    expect(document.lines[0]?.hsnCode).toBe('5208')
    expect(document.totalAmount).toBe('8450.00')
    expect(document.isInterState).toBe(true)
    expect(document.lines[0]?.igstAmount).toBe('400.00')
    expect(document.totalIgst).toBe('400.00')
    expect(document.hsnSummary).toHaveLength(1)
    expect(document.amountInWords).toContain('Rupees')
  })
})
