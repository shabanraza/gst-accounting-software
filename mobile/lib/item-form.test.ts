import { describe, expect, it } from 'vitest'

import {
  buildCreateItemInput,
  buildUpdateItemInput,
  createInitialItemForm,
  itemFormFromRecord,
  validateItemForm,
} from './item-form.ts'

describe('item-form', () => {
  it('validates required fields', () => {
    const form = createInitialItemForm()
    expect(validateItemForm(form)).toBe('Item name is required.')

    form.name = 'Cotton Fabric'
    expect(validateItemForm(form)).toBe('HSN code is required.')

    form.hsnCode = '5208'
    expect(validateItemForm(form)).toBeNull()
  })

  it('maps item records to edit form', () => {
    expect(
      itemFormFromRecord({
        id: 'item-1',
        name: 'Cotton Fabric',
        alias: 'CTN',
        itemGroup: 'Fabrics',
        hsnCode: '5208',
        gstRate: '5.00',
        baseUnit: 'Meter',
        purchaseRate: '80.00',
        saleRate: '100.00',
        tracksInventory: true,
      }),
    ).toMatchObject({
      name: 'Cotton Fabric',
      hsnCode: '5208',
      openingQuantity: '',
    })
  })

  it('builds updateItem payload', () => {
    const form = createInitialItemForm()
    form.name = 'Cotton Fabric'
    form.hsnCode = '5208'

    expect(buildUpdateItemInput(form, 'company-1', 'item-1')).toMatchObject({
      companyId: 'company-1',
      itemId: 'item-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
    })
  })

  it('builds createItemWithOpening payload', () => {
    const form = createInitialItemForm()
    form.name = 'Cotton Fabric'
    form.hsnCode = '5208'
    form.purchaseRate = '80.00'
    form.saleRate = '100.00'
    form.openingQuantity = '50'

    expect(buildCreateItemInput(form, 'company-1')).toMatchObject({
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      purchaseRate: '80.00',
      saleRate: '100.00',
      openingQuantity: '50',
      tracksInventory: true,
    })
  })
})
