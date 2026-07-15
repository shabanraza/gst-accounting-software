import { describe, expect, it } from 'vitest'

import {
  applyItemToPurchaseOrderLine,
  buildCreatePurchaseOrderInput,
  createInitialPurchaseOrderForm,
  filterSupplierParties,
  validatePurchaseOrderForm,
} from './purchase-order-form.ts'

describe('purchase-order-form', () => {
  it('filters supplier parties', () => {
    expect(
      filterSupplierParties([
        { id: '1', name: 'Retail', partyType: 'customer' },
        { id: '2', name: 'Vendor', partyType: 'supplier' },
      ]),
    ).toHaveLength(1)
  })

  it('applies item defaults to line', () => {
    expect(
      applyItemToPurchaseOrderLine(
        {
          itemId: '',
          itemName: '',
          unit: '',
          quantity: '2',
          rate: '',
          gstRate: '0',
        },
        {
          id: 'item-1',
          name: 'Fabric',
          baseUnit: 'Meter',
          purchaseRate: '80.00',
          gstRate: '12',
        },
      ),
    ).toMatchObject({
      itemId: 'item-1',
      rate: '80.00',
      gstRate: '12',
    })
  })

  it('validates required fields', () => {
    const form = createInitialPurchaseOrderForm()
    expect(validatePurchaseOrderForm(form)).toBe('Select a supplier.')

    form.supplierId = 'sup-1'
    expect(validatePurchaseOrderForm(form)).toBe('Select an item.')

    form.line.itemId = 'item-1'
    form.line.itemName = 'Fabric'
    form.line.unit = 'Meter'
    form.line.rate = '100'
    expect(validatePurchaseOrderForm(form)).toBeNull()
  })

  it('builds create payload', () => {
    const form = createInitialPurchaseOrderForm()
    form.supplierId = 'sup-1'
    form.line = {
      itemId: 'item-1',
      itemName: 'Fabric',
      unit: 'Meter',
      quantity: '2',
      rate: '100.00',
      gstRate: '12',
    }

    expect(
      buildCreatePurchaseOrderInput(form, 'company-1', 'PO-0001'),
    ).toMatchObject({
      companyId: 'company-1',
      orderNumber: 'PO-0001',
      supplierId: 'sup-1',
    })
  })
})
