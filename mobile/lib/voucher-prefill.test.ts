import { describe, expect, test } from 'vitest'

import { createInitialPurchaseBillForm } from './purchase-bill-form.ts'
import { createInitialSalesInvoiceForm } from './sales-invoice-form.ts'
import {
  applyGrnDraft,
  applySalesDocumentDraft,
} from './voucher-prefill.ts'

describe('voucher prefill', () => {
  test('applies sales document draft with trailing empty line', () => {
    const form = createInitialSalesInvoiceForm('Main', '27')
    const next = applySalesDocumentDraft(form, {
      sourceDocumentId: 'doc-1',
      customerId: 'cust-1',
      documentDate: '2026-04-01',
      narration: 'From quote',
      lines: [
        {
          itemId: 'item-1',
          itemName: 'Widget',
          hsnCode: '8471',
          gstRate: '18',
          quantity: '2',
          unit: 'Nos',
          rate: '100.00',
        },
      ],
    }, {
      godownName: 'Main',
      companyStateCode: '27',
      partyStateCode: '27',
    })

    expect(next.customerId).toBe('cust-1')
    expect(next.invoiceDate).toBe('2026-04-01')
    expect(next.narration).toBe('From quote')
    expect(next.lines).toHaveLength(2)
    expect(next.lines[0]?.itemName).toBe('Widget')
    expect(next.lines[1]?.itemId).toBe('')
    expect(next.region).toBe('local')
    expect(next.placeOfSupply).toBe('27')
  })

  test('applies GRN draft with godown and interstate region', () => {
    const form = createInitialPurchaseBillForm('Main', '27')
    const next = applyGrnDraft(form, {
      sourceGrnId: 'grn-1',
      supplierId: 'sup-1',
      grnDate: '2026-04-02',
      narration: 'GRN note',
      godownName: 'Warehouse',
      lines: [
        {
          itemId: 'item-2',
          itemName: 'Cable',
          hsnCode: '8544',
          gstRate: '12',
          quantity: '5',
          unit: 'Mtr',
          rate: '20.00',
        },
      ],
    }, {
      defaultGodownName: 'Main',
      companyStateCode: '27',
      partyStateCode: '09',
    })

    expect(next.supplierId).toBe('sup-1')
    expect(next.billDate).toBe('2026-04-02')
    expect(next.godownName).toBe('Warehouse')
    expect(next.lines[0]?.itemName).toBe('Cable')
    expect(next.lines).toHaveLength(2)
    expect(next.region).toBe('central')
    expect(next.placeOfSupply).toBe('09')
  })
})
