import { describe, expect, test } from 'vitest'

import { createItem } from '#/features/inventory/item-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'
import {
  buildStockValuation,
  totalStockValue,
} from '#/features/inventory/stock-valuation-service.ts'

describe('buildStockValuation', () => {
  test('values stock at its moving average cost, not the item purchase rate', async () => {
    const items = new InMemoryItemRepository()
    const balances = new InMemoryStockStore()
    const item = await createItem(items, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })
    await recordStockMovement(balances, balances, {
      companyId: 'company-1',
      itemId: item.id,
      movementType: 'purchase_in',
      quantity: '3',
      unit: 'meter',
      referenceType: 'purchase_bill',
      referenceId: 'bill-1',
      occurredOn: '2026-07-01',
      value: '200.00',
    })

    const rows = await buildStockValuation({ balances, items }, 'company-1')

    expect(rows).toEqual([
      expect.objectContaining({
        quantity: '3',
        avgRate: '66.67',
        stockValue: '200.00',
      }),
    ])
    expect(totalStockValue(rows)).toBe('200.00')
  })
})
