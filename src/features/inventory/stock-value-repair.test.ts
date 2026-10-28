import { describe, expect, test } from 'vitest'

import { planStockValueRepair } from '#/features/inventory/stock-value-repair.ts'

const items = [
  { id: 'item-a', name: 'Cotton', purchaseRate: '80.00' },
  { id: 'item-b', name: 'Silk', purchaseRate: '0.00' },
]

describe('planStockValueRepair', () => {
  test('books unvalued opening stock at the item purchase rate', () => {
    const plan = planStockValueRepair({
      items,
      unvaluedOpenings: [
        {
          movementId: 'move-1',
          itemId: 'item-a',
          quantity: '100',
          occurredOn: '2026-04-01',
          referenceType: 'starter_opening',
        },
      ],
      unvaluedBalances: [],
      bookStockBalance: '-320.00',
      valuedStockTotal: '0.00',
    })

    expect(plan.openingEntries).toEqual([
      {
        movementId: 'move-1',
        itemId: 'item-a',
        itemName: 'Cotton',
        quantity: '100',
        occurredOn: '2026-04-01',
        value: '8000.00',
        seeded: true,
      },
    ])
  })

  test('reports opening stock with no purchase rate instead of inventing one', () => {
    const plan = planStockValueRepair({
      items,
      unvaluedOpenings: [
        {
          movementId: 'move-2',
          itemId: 'item-b',
          quantity: '5',
          occurredOn: '2026-04-01',
          referenceType: 'item_opening',
        },
      ],
      unvaluedBalances: [{ itemId: 'item-b', quantity: '5' }],
      bookStockBalance: '0.00',
      valuedStockTotal: '0.00',
    })

    expect(plan.openingEntries).toEqual([])
    expect(plan.unpricedOpenings).toEqual([
      { movementId: 'move-2', itemName: 'Silk', quantity: '5' },
    ])
    expect(plan.balanceValues).toEqual([{ itemId: 'item-b', value: '0.00' }])
  })

  test('values legacy balances and reconciles books to the stock valuation', () => {
    // Books: opening never posted, purchases at cost 7,000, COGS at the
    // master rate 7,320 → -320. Stock on hand: 90 + opening posted 8,000.
    const plan = planStockValueRepair({
      items,
      unvaluedOpenings: [
        {
          movementId: 'move-1',
          itemId: 'item-a',
          quantity: '100',
          occurredOn: '2026-04-01',
          referenceType: 'item_opening',
        },
      ],
      unvaluedBalances: [{ itemId: 'item-a', quantity: '90' }],
      bookStockBalance: '-320.00',
      valuedStockTotal: '0.00',
    })

    expect(plan.balanceValues).toEqual([{ itemId: 'item-a', value: '7200.00' }])
    // Books after opening: 7,680. Valuation: 7,200. Reduce books by 480.
    expect(plan.reconciliation).toBe('-480.00')
  })

  test('plans nothing once the books already match', () => {
    const plan = planStockValueRepair({
      items,
      unvaluedOpenings: [],
      unvaluedBalances: [],
      bookStockBalance: '1500.00',
      valuedStockTotal: '1500.00',
    })

    expect(plan).toEqual({
      openingEntries: [],
      unpricedOpenings: [],
      balanceValues: [],
      reconciliation: '0.00',
    })
  })
})
