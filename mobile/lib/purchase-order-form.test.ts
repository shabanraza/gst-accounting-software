import { describe, expect, it } from 'vitest'

import {
  applyItemToPurchaseOrderLine,
  buildCreatePurchaseOrderInput,
  computePurchaseOrderFormTotal,
  createEmptyPurchaseOrderLine,
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
      applyItemToPurchaseOrderLine(createEmptyPurchaseOrderLine(), {
        id: 'item-1',
        name: 'Fabric',
        baseUnit: 'Meter',
        purchaseRate: '80.00',
        gstRate: '12',
      }),
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
    expect(validatePurchaseOrderForm(form)).toBe('Add at least one item.')

    form.lines[0] = {
      ...form.lines[0],
      itemId: 'item-1',
      itemName: 'Fabric',
      unit: 'Meter',
      rate: '100',
    }
    expect(validatePurchaseOrderForm(form)).toBeNull()
  })

  it('computes estimated total across lines', () => {
    const form = createInitialPurchaseOrderForm()
    form.lines = [
      {
        ...createEmptyPurchaseOrderLine(),
        itemId: 'item-1',
        quantity: '2',
        rate: '100',
      },
      {
        ...createEmptyPurchaseOrderLine(),
        itemId: 'item-2',
        quantity: '1',
        rate: '50',
      },
    ]

    expect(computePurchaseOrderFormTotal(form)).toBe('250.00')
  })

  it('builds create payload with multiple lines', () => {
    const form = createInitialPurchaseOrderForm()
    form.supplierId = 'sup-1'
    form.lines = [
      {
        ...createEmptyPurchaseOrderLine(),
        itemId: 'item-1',
        itemName: 'Fabric',
        unit: 'Meter',
        quantity: '2',
        rate: '100.00',
        gstRate: '12',
      },
      {
        ...createEmptyPurchaseOrderLine(),
        itemId: 'item-2',
        itemName: 'Thread',
        unit: 'Box',
        quantity: '1',
        rate: '25.00',
        gstRate: '5',
      },
    ]

    expect(
      buildCreatePurchaseOrderInput(form, 'company-1', 'PO-0001'),
    ).toMatchObject({
      companyId: 'company-1',
      orderNumber: 'PO-0001',
      supplierId: 'sup-1',
      lines: [
        { itemId: 'item-1', quantity: '2' },
        { itemId: 'item-2', quantity: '1' },
      ],
    })
  })
})
