import { describe, expect, test } from 'vitest'

import { InMemoryStockStore } from '#/features/inventory/inventory-store.ts'
import {
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
  await recordStockMovement(
    store,
    store,
    line({
      itemId: 'item-a',
      movementType: 'purchase_in',
      quantity: '10',
      value: '800.00',
      referenceType: 'purchase_bill',
    }),
  )
  await recordStockMovement(
    store,
    store,
    line({
      itemId: 'item-b',
      movementType: 'purchase_in',
      quantity: '3',
      value: '100.00',
      referenceType: 'purchase_bill',
    }),
  )
  return store
}

const document = [
  line({ itemId: 'item-a', quantity: '2' }),
  line({
    itemId: 'item-b',
    movementType: 'purchase_in',
    quantity: '6',
    value: '260.00',
    referenceType: 'purchase_bill',
  }),
  line({ itemId: 'item-b', quantity: '4' }),
  line({ itemId: 'item-a', quantity: '3' }),
]

describe('recordStockMovements', () => {
  test('gives exactly the same quantities and values as recording line by line', async () => {
    const sequential = await stockedStore()
    const expectedMovements = []
    for (const input of document) {
      expectedMovements.push(
        await recordStockMovement(sequential, sequential, input),
      )
    }
    const batched = await stockedStore()

    const movements = await recordStockMovements(batched, batched, document)

    expect(
      movements.map(({ itemId, quantity, value }) => ({
        itemId,
        quantity,
        value,
      })),
    ).toEqual(
      expectedMovements.map(({ itemId, quantity, value }) => ({
        itemId,
        quantity,
        value,
      })),
    )
    expect(await batched.listBalancesByCompany('company-1')).toEqual(
      await sequential.listBalancesByCompany('company-1'),
    )
  })

  test('uses one read, one insert and one balance write for the whole document', async () => {
    const store = await stockedStore()
    const calls: Record<string, number> = {}
    for (const name of [
      'getBalance',
      'getValue',
      'getBalances',
      'createMovement',
      'createMovements',
      'setBalance',
      'setBalances',
    ]) {
      const target = store as unknown as Record<
        string,
        (...args: Array<unknown>) => unknown
      >
      const original = target[name].bind(store)
      target[name] = (...args: Array<unknown>) => {
        calls[name] = (calls[name] ?? 0) + 1
        return original(...args)
      }
    }

    await recordStockMovements(store, store, document)

    expect(calls).toEqual({
      getBalances: 1,
      createMovements: 1,
      setBalances: 1,
    })
  })

  test('writes nothing when a later line runs short', async () => {
    const store = await stockedStore()
    const before = await store.listBalancesByCompany('company-1')

    await expect(
      recordStockMovements(store, store, [
        line({ itemId: 'item-a', quantity: '6', itemName: 'Item A' }),
        line({ itemId: 'item-a', quantity: '5', itemName: 'Item A' }),
      ]),
    ).rejects.toThrow('Insufficient stock for Item A: requested 5, available 4')

    expect(await store.listBalancesByCompany('company-1')).toEqual(before)
    expect((await store.listByCompanyId('company-1')).length).toBe(2)
  })
})
