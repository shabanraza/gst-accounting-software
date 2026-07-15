import { describe, expect, it } from 'vitest'

import {
  buildPurchaseReturnInput,
  buildSalesReturnInput,
  createInitialReturnForm,
  resolvePartyStateCode,
  validateReturnForm,
  validateReturnLedgerMappings,
} from './return-form.ts'

describe('return-form', () => {
  it('validates required fields', () => {
    const form = createInitialReturnForm()
    expect(validateReturnForm(form)).toBe('Select a sales invoice.')

    form.documentId = 'inv-1'
    expect(validateReturnForm(form)).toBeNull()
  })

  it('validates ledger mappings by mode', () => {
    expect(
      validateReturnLedgerMappings({
        mode: 'sales',
        ledgerBySystemKey: { sales: 'a' },
      }),
    ).toContain('missing')

    expect(
      validateReturnLedgerMappings({
        mode: 'sales',
        ledgerBySystemKey: {
          sales: 'a',
          output_gst: 'b',
          customer_receivable: 'c',
        },
      }),
    ).toBeNull()
  })

  it('resolves party state from company fallback', () => {
    expect(resolvePartyStateCode(undefined, '27')).toBe('27')
    expect(resolvePartyStateCode({ id: '1', stateCode: '09' }, '27')).toBe(
      '09',
    )
  })

  it('builds sales return payload', () => {
    const form = createInitialReturnForm()
    form.documentId = 'inv-1'

    expect(
      buildSalesReturnInput({
        form,
        companyId: 'company-1',
        companyStateCode: '27',
        customerId: 'cust-1',
        customerStateCode: '27',
        salesInvoiceId: 'inv-1',
        quantity: '1',
        line: {
          itemId: 'item-1',
          description: 'Fabric',
          quantity: '2',
          unit: 'Meter',
          rate: '100',
          gstRate: '12',
        },
        ledgerBySystemKey: {
          sales: 'sales',
          output_gst: 'gst',
          customer_receivable: 'recv',
        },
      }),
    ).toMatchObject({
      companyId: 'company-1',
      salesInvoiceId: 'inv-1',
    })
  })

  it('builds purchase return payload', () => {
    const form = createInitialReturnForm()
    form.mode = 'purchase'
    form.documentId = 'bill-1'

    expect(
      buildPurchaseReturnInput({
        form,
        companyId: 'company-1',
        companyStateCode: '27',
        supplierId: 'sup-1',
        supplierStateCode: '27',
        purchaseBillId: 'bill-1',
        quantity: '1',
        line: {
          itemId: 'item-1',
          description: 'Fabric',
          quantity: '2',
          unit: 'Meter',
          rate: '80',
          gstRate: '12',
        },
        ledgerBySystemKey: {
          purchase: 'purchase',
          input_gst: 'gst',
          supplier_payable: 'pay',
        },
      }),
    ).toMatchObject({
      purchaseBillId: 'bill-1',
    })
  })
})
