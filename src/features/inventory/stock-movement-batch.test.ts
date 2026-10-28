import { describe, expect, test } from 'vitest'

import { InMemoryStockStore } from '#/features/inventory/inventory-store.ts'
import {
  getCurrentStock,
  recordStockMovement,
  recordStockMovements,
} from '#/features/inventory/stock-movement-service.ts'

import type { RecordStockMovementInput } from '#/features/inventory/stock-movement-service.ts'

function line(
  overrides: Partial<RecordStockMovementInput>,
): RecordStockMovementInput {
  return {
    companyId: 'company-1',
    itemId: 'item-a',
    movementType: 'sale_out',
    quantity: '1',
    unit: 'meter',
    referenceType: 'sales_invoice',
    referenceId: 'inv-1',
    occurredOn: '2026-07-11',
    ...overrides,
  }
}

async function stockedStore() {
  const store = new InMemoryStockStore()
  for (const itemId of ['item-a', 'item-b']) {
    await recordStockMovement(
      store,
      store,
      line({
        itemId,
        movementType: 'opening',
        quantity: '10',
        referenceType: 'item_opening',
        referenceId: itemId,
      }),
    )
  }
  return store
}

function countCalls(store: InMemoryStockStore) {
  const calls: Record<string, number> = {}
  for (const name of [
    'getBalance',
    'getBalances',
    'createMovement',
    'createMovements',
    'setBalance',
    'setBalances',
  ] as const) {
    const original = (
      store as unknown as Record<string, (...args: Array<unknown>) => unknown>
    )[name].bind(store)
    ;(store as unknown as Record<string, unknown>)[name] = (
      ...args: Array<unknown>
    ) => {
      calls[name] = (calls[name] ?? 0) + 1
      return original(...args)
    }
  }
  return calls
}

describe('recordStockMovements', () => {
  test('records every line with one read, one insert and one balance write', async () => {
    const store = await stockedStore()
    const calls = countCalls(store)

    await recordStockMovements(store, store, [
      line({ itemId: 'item-a', quantity: '2' }),
      line({ itemId: 'item-b', quantity: '3' }),
      line({ itemId: 'item-a', quantity: '4' }),
    ])

    expect(calls).toEqual({
      getBalances: 1,
      createMovements: 1,
      setBalances: 1,
    })
    expect(await getCurrentStock(store, 'company-1', 'item-a')).toBe('4')
    expect(await getCurrentStock(store, 'company-1', 'item-b')).toBe('7')
  })

  test('checks repeated items in order and writes nothing when one runs short', async () => {
    const store = await stockedStore()
    const before = (await store.listByCompanyId('company-1')).length

    await expect(
      recordStockMovements(store, store, [
        line({ itemId: 'item-a', quantity: '6', itemName: 'Item A' }),
        line({ itemId: 'item-b', quantity: '1' }),
        line({ itemId: 'item-a', quantity: '5', itemName: 'Item A' }),
      ]),
    ).rejects.toThrow('Insufficient stock for Item A: requested 5, available 4')

    expect((await store.listByCompanyId('company-1')).length).toBe(before)
    expect(await getCurrentStock(store, 'company-1', 'item-a')).toBe('10')
  })
})
