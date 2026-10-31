import { describe, expect, test } from 'vitest'

import { InMemoryStockStore } from '#/features/inventory/inventory-store.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { RecordStockMovementInput } from '#/features/inventory/stock-movement-service.ts'

const companyId = 'company-1'
const itemId = 'item-1'

function movement(
  overrides: Partial<RecordStockMovementInput>,
): RecordStockMovementInput {
  return {
    companyId,
    itemId,
    movementType: 'purchase_in',
    quantity: '1',
    unit: 'pcs',
    referenceType: 'test',
    referenceId: 'ref-1',
    occurredOn: '2026-10-01',
    ...overrides,
  }
}

describe('moving weighted-average stock value', () => {
  test('inbound movement adds its value to the item balance', async () => {
    const stock = new InMemoryStockStore()

    const created = await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '10', value: '800.00' }),
    )

    expect(created.value).toBe('800.00')
    expect(await stock.getBalance(companyId, itemId)).toBe('10')
    expect(await stock.getValue(companyId, itemId)).toBe('800.00')
  })

  test('outbound movement removes value at the moving average cost', async () => {
    const stock = new InMemoryStockStore()
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '10', value: '800.00' }),
    )
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '10', value: '1000.00' }),
    )

    const sale = await recordStockMovement(
      stock,
      stock,
      movement({ movementType: 'sale_out', quantity: '5' }),
    )

    expect(sale.value).toBe('450.00')
    expect(await stock.getBalance(companyId, itemId)).toBe('15')
    expect(await stock.getValue(companyId, itemId)).toBe('1350.00')
  })

  test('selling the last unit removes all remaining value', async () => {
    const stock = new InMemoryStockStore()
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '3', value: '100.00' }),
    )
    await recordStockMovement(
      stock,
      stock,
      movement({ movementType: 'sale_out', quantity: '1' }),
    )

    const last = await recordStockMovement(
      stock,
      stock,
      movement({ movementType: 'sale_out', quantity: '2' }),
    )

    expect(last.value).toBe('66.67')
    expect(await stock.getValue(companyId, itemId)).toBe('0.00')
  })

  test('inbound movement without a value comes in at the current average', async () => {
    const stock = new InMemoryStockStore()
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '4', value: '200.00' }),
    )

    const returned = await recordStockMovement(
      stock,
      stock,
      movement({ movementType: 'sales_return_in', quantity: '2' }),
    )

    expect(returned.value).toBe('100.00')
    expect(await stock.getValue(companyId, itemId)).toBe('300.00')
  })

  test('rejects a negative movement value', async () => {
    const stock = new InMemoryStockStore()

    await expect(
      recordStockMovement(
        stock,
        stock,
        movement({ quantity: '1', value: '-5.00' }),
      ),
    ).rejects.toThrow('Invalid stock value')
  })

  test('lists balances with their value', async () => {
    const stock = new InMemoryStockStore()
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '2', value: '50.00' }),
    )

    expect(await stock.listBalancesByCompany(companyId)).toEqual([
      { companyId, itemId, quantity: '2', value: '50.00' },
    ])
  })

  test('finds movements by reference', async () => {
    const stock = new InMemoryStockStore()
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '2', value: '50.00', referenceId: 'bill-1' }),
    )
    await recordStockMovement(
      stock,
      stock,
      movement({ quantity: '1', value: '30.00', referenceId: 'bill-2' }),
    )

    const found = await stock.listByReference(companyId, 'test', 'bill-2')

    expect(found.map((entry) => entry.value)).toEqual(['30.00'])
  })
})
