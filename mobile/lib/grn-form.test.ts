import { describe, expect, it } from 'vitest'

import {
  buildReceiveFromPurchaseOrderInput,
  createInitialGrnForm,
  filterOpenPurchaseOrders,
  validateGrnForm,
} from './grn-form.ts'

describe('grn-form', () => {
  it('filters open purchase orders', () => {
    expect(
      filterOpenPurchaseOrders([
        { id: '1', orderNumber: 'PO-1', status: 'open' },
        { id: '2', orderNumber: 'PO-2', status: 'closed' },
      ]),
    ).toHaveLength(1)
  })

  it('validates required fields', () => {
    const form = createInitialGrnForm()
    expect(validateGrnForm(form)).toBe('Select a purchase order.')

    form.purchaseOrderId = 'po-1'
    expect(validateGrnForm(form)).toBeNull()
  })

  it('builds receive payload', () => {
    const form = createInitialGrnForm('Main')
    form.purchaseOrderId = 'po-1'

    expect(
      buildReceiveFromPurchaseOrderInput(form, 'company-1', 'GRN-0001'),
    ).toMatchObject({
      companyId: 'company-1',
      purchaseOrderId: 'po-1',
      grnNumber: 'GRN-0001',
      godownName: 'Main',
    })
  })
})
