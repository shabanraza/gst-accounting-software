import { describe, expect, test } from 'vitest'

import {
  isAtOrBelowReorderLevel,
  needsRestock,
} from '#/features/inventory/low-stock.ts'

describe('isAtOrBelowReorderLevel', () => {
  test('flags stock at or below the reorder level', () => {
    expect(
      isAtOrBelowReorderLevel({
        quantity: '7',
        reorderLevel: '8',
        tracksInventory: true,
      }),
    ).toBe(true)
    expect(
      isAtOrBelowReorderLevel({
        quantity: '8',
        reorderLevel: '8',
        tracksInventory: true,
      }),
    ).toBe(true)
    expect(
      isAtOrBelowReorderLevel({
        quantity: '9',
        reorderLevel: '8',
        tracksInventory: true,
      }),
    ).toBe(false)
  })

  test('ignores items without a reorder level or not tracking stock', () => {
    expect(
      isAtOrBelowReorderLevel({
        quantity: '0',
        reorderLevel: null,
        tracksInventory: true,
      }),
    ).toBe(false)
    expect(
      isAtOrBelowReorderLevel({
        quantity: '0',
        reorderLevel: '5',
        tracksInventory: false,
      }),
    ).toBe(false)
  })
})

describe('needsRestock', () => {
  test('flags low stock by reorder level and empty stock without one', () => {
    expect(
      needsRestock({ quantity: '7', reorderLevel: '8', tracksInventory: true }),
    ).toBe(true)
    expect(
      needsRestock({ quantity: '0', reorderLevel: '', tracksInventory: true }),
    ).toBe(true)
    expect(
      needsRestock({ quantity: '3', reorderLevel: '', tracksInventory: true }),
    ).toBe(false)
    expect(
      needsRestock({ quantity: '0', reorderLevel: '', tracksInventory: false }),
    ).toBe(false)
  })
})
