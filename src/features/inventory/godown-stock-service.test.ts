import { describe, expect, test } from 'vitest'

import {
  foldGodownStock,
  godownQuantity,
} from '#/features/inventory/godown-stock-service.ts'

import type { StockMovementRecord } from '#/features/inventory/stock-movement-service.ts'

function movement(
  overrides: Partial<StockMovementRecord> &
    Pick<StockMovementRecord, 'direction' | 'quantity'>,
): StockMovementRecord {
  return {
    id: crypto.randomUUID(),
    companyId: 'company-1',
    itemId: 'item-1',
    movementType: overrides.direction === 'in' ? 'purchase_in' : 'sale_out',
    unit: 'PCS',
    referenceType: 'test',
    referenceId: 'ref',
    occurredOn: '2026-05-01',
    godownName: null,
    value: '0.00',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('foldGodownStock', () => {
  test('folds movements per item and godown, with no godown meaning the default', () => {
    const rows = foldGodownStock(
      [
        movement({ direction: 'in', quantity: '10' }),
        movement({ direction: 'in', quantity: '4', godownName: 'Shop' }),
        movement({ direction: 'out', quantity: '2.5', godownName: 'Main' }),
        movement({ direction: 'in', quantity: '1', itemId: 'item-2' }),
        movement({ direction: 'out', quantity: '1', itemId: 'item-2' }),
      ],
      'Main',
    )

    expect(rows).toEqual([
      { itemId: 'item-1', godownName: 'Main', quantity: '7.5' },
      { itemId: 'item-1', godownName: 'Shop', quantity: '4' },
    ])
  })

  test('reads one item quantity in one godown', () => {
    const movements = [
      movement({ direction: 'in', quantity: '10' }),
      movement({ direction: 'out', quantity: '3', godownName: 'Shop' }),
      movement({ direction: 'in', quantity: '5', godownName: 'Shop' }),
    ]

    expect(godownQuantity(movements, 'item-1', 'Main', 'Main')).toBe('10')
    expect(godownQuantity(movements, 'item-1', 'Shop', 'Main')).toBe('2')
    expect(godownQuantity(movements, 'item-1', 'Back', 'Main')).toBe('0')
  })
})
