import { describe, expect, it } from 'vitest'

import {
  buildRecordStockMovementInput,
  createInitialStockAdjustmentForm,
  validateStockAdjustmentForm,
} from './stock-adjustment-form.ts'

describe('stock-adjustment-form', () => {
  it('validates required fields', () => {
    const form = createInitialStockAdjustmentForm()
    expect(validateStockAdjustmentForm(form)).toBe('Select an item.')

    form.itemId = 'item-1'
    expect(validateStockAdjustmentForm(form)).toBe('Unit is required.')

    form.unit = 'Piece'
    expect(validateStockAdjustmentForm(form)).toBeNull()
  })

  it('builds stock movement payload', () => {
    const form = createInitialStockAdjustmentForm()
    form.itemId = 'item-1'
    form.unit = 'Piece'
    form.quantity = '-2'

    expect(
      buildRecordStockMovementInput(form, 'company-1', 'ref-1'),
    ).toMatchObject({
      companyId: 'company-1',
      movementType: 'adjustment',
      quantity: '2.000',
    })
  })
})
