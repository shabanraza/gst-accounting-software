import { describe, expect, it } from 'vitest'

import {
  computeLinesSubtotal,
  filledDocumentLines,
  validateDocumentLine,
} from './document-lines.ts'

describe('document-lines', () => {
  it('filters filled lines', () => {
    expect(
      filledDocumentLines([
        { itemId: 'a' },
        { itemId: '' },
        { itemId: 'b' },
      ]),
    ).toHaveLength(2)
  })

  it('computes subtotal', () => {
    expect(
      computeLinesSubtotal([
        { quantity: '2', rate: '100' },
        { quantity: '1', rate: '50' },
      ]),
    ).toBe('250.00')
  })

  it('validates line fields', () => {
    expect(
      validateDocumentLine(
        { itemId: '', quantity: '1', rate: '10' },
        1,
      ),
    ).toBe('Select an item on line 1.')
  })
})
