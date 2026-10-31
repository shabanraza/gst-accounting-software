import { describe, expect, test } from 'vitest'

import { planStockValueRepair } from '#/features/inventory/stock-value-repair.ts'

import type { StockValueRepairInput } from '#/features/inventory/stock-value-repair.ts'

const items = [
  { id: 'item-a', name: 'Cotton', purchaseRate: '80.00' },
  { id: 'item-b', name: 'Silk', purchaseRate: '0.00' },
]

function opening(
  overrides: Partial<StockValueRepairInput['unvaluedOpenings'][number]>,
): StockValueRepairInput['unvaluedOpenings'][number] {
  return {
    movementId: 'move-1',
    itemId: 'item-a',
    quantity: '40',
    occurredOn: '2026-04-01',
    referenceType: 'item_opening',
    createdOn: '2026-11-01',
    ...overrides,
  }
}

const base = {
  items,
  unvaluedBalances: [],
  bookStockBalance: '0.00',
  valuedStockTotal: '0.00',
  legacyBefore: '2026-10-29',
}

describe('planStockValueRepair', () => {
  test('books unvalued user-entered opening stock at the item purchase rate', () => {
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [opening({ quantity: '40', createdOn: '2026-07-01' })],
    })

    expect(plan.openingEntries).toEqual([
      {
        movementId: 'move-1',
        itemId: 'item-a',
        itemName: 'Cotton',
        quantity: '40',
        occurredOn: '2026-04-01',
        value: '3200.00',
      },
    ])
    expect(plan.needsReview).toEqual([])
  })

  test.each([
    ['seeded starter stock', { referenceType: 'starter_opening' }],
    ['the old invented default of 100', { quantity: '100' }],
  ])('never books %s; lists it for owner review', (_label, overrides) => {
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [opening({ createdOn: '2026-07-01', ...overrides })],
      unvaluedBalances: [{ itemId: 'item-a', quantity: '100' }],
    })

    expect(plan.openingEntries).toEqual([])
    expect(plan.needsReview).toEqual([
      expect.objectContaining({ movementId: 'move-1', itemName: 'Cotton' }),
    ])
    // Its balance is left unvalued and the books are not plugged to match it.
    expect(plan.balanceValues).toEqual([])
    expect(plan.reconciliation).toBeNull()
  })

  test('trusts a quantity of 100 entered after the legacy cutoff', () => {
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [opening({ quantity: '100', createdOn: '2026-11-01' })],
    })

    expect(plan.openingEntries).toHaveLength(1)
    expect(plan.needsReview).toEqual([])
  })

  test('reports opening stock with no purchase rate instead of inventing one', () => {
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [
        opening({ movementId: 'move-2', itemId: 'item-b', quantity: '5' }),
      ],
      unvaluedBalances: [{ itemId: 'item-b', quantity: '5' }],
    })

    expect(plan.openingEntries).toEqual([])
    expect(plan.unpricedOpenings).toEqual([
      { movementId: 'move-2', itemName: 'Silk', quantity: '5' },
    ])
    expect(plan.balanceValues).toEqual([{ itemId: 'item-b', value: '0.00' }])
  })

  test('values legacy balances and reconciles books to the stock valuation', () => {
    // Books: opening never posted, purchases at cost 7,000, COGS at the
    // master rate 7,320 → -320. Stock on hand: 90; opening 40 → 3,200.
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [opening({ quantity: '40' })],
      unvaluedBalances: [{ itemId: 'item-a', quantity: '90' }],
      bookStockBalance: '-320.00',
    })

    expect(plan.balanceValues).toEqual([{ itemId: 'item-a', value: '7200.00' }])
    // Books after opening: 2,880. Valuation: 7,200. Add 4,320 to books.
    expect(plan.reconciliation).toBe('4320.00')
  })

  test('can leave profit untouched: books openings and values, but posts no COGS plug', () => {
    const input = {
      ...base,
      unvaluedOpenings: [opening({ quantity: '40' })],
      unvaluedBalances: [{ itemId: 'item-a', quantity: '90' }],
      bookStockBalance: '-320.00',
    }
    const reconciled = planStockValueRepair(input)
    const plan = planStockValueRepair({ ...input, reconcile: false })

    expect(plan.openingEntries).toEqual(reconciled.openingEntries)
    expect(plan.balanceValues).toEqual(reconciled.balanceValues)
    expect(plan.reconciliation).toBeNull()
    // The remaining gap is still reported so the owner can review it.
    expect(plan.difference).toBe('4320.00')
  })

  test('plans nothing once the books already match', () => {
    const plan = planStockValueRepair({
      ...base,
      unvaluedOpenings: [],
      bookStockBalance: '1500.00',
      valuedStockTotal: '1500.00',
    })

    expect(plan).toEqual({
      openingEntries: [],
      needsReview: [],
      unpricedOpenings: [],
      balanceValues: [],
      reconciliation: '0.00',
      difference: '0.00',
    })
  })
})
