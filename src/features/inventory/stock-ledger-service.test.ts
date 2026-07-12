import { describe, expect, test } from 'vitest'

import { buildStockLedger, buildStockSummary } from '#/features/inventory/stock-ledger-service.ts'
import { InMemoryItemRepository, InMemoryStockStore } from '#/features/inventory/inventory-store.ts'

describe('buildStockLedger', () => {
  test('computes running balance in chronological order', async () => {
    const stock = new InMemoryStockStore()
    await stock.createMovement({
      id: 'move-1',
      companyId: 'company-1',
      itemId: 'item-1',
      movementType: 'opening',
      direction: 'in',
      quantity: '10',
      unit: 'PCS',
      referenceType: 'opening',
      referenceId: 'item-1',
      occurredOn: '2026-01-01',
      godownName: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    await stock.createMovement({
      id: 'move-2',
      companyId: 'company-1',
      itemId: 'item-1',
      movementType: 'sale_out',
      direction: 'out',
      quantity: '4',
      unit: 'PCS',
      referenceType: 'sales_invoice',
      referenceId: 'inv-1',
      occurredOn: '2026-01-05',
      godownName: null,
      createdAt: new Date('2026-01-05T00:00:00Z'),
    })

    const report = await buildStockLedger({ movements: stock }, 'company-1', 'item-1')

    expect(report.rows).toHaveLength(2)
    expect(report.rows[0]?.runningBalance).toBe('10')
    expect(report.rows[1]?.runningBalance).toBe('6')
    expect(report.closingBalance).toBe('6')
  })
})

describe('buildStockSummary', () => {
  test('joins balances with item names', async () => {
    const stock = new InMemoryStockStore()
    const items = new InMemoryItemRepository()
    await items.create({
      id: 'item-1',
      companyId: 'company-1',
      name: 'Cotton Fabric',
      alias: null,
      itemGroup: null,
      hsnCode: '5208',
      gstRate: '5',
      baseUnit: 'MTR',
      alternateUnit: null,
      conversionFactor: null,
      mrp: null,
      reorderLevel: null,
      purchaseRate: '100.00',
      saleRate: '150.00',
      tracksInventory: true,
      createdAt: new Date(),
    })
    await stock.setBalance('company-1', 'item-1', '25')

    const summary = await buildStockSummary({ balances: stock, items }, 'company-1')

    expect(summary).toHaveLength(1)
    expect(summary[0]?.itemName).toBe('Cotton Fabric')
    expect(summary[0]?.quantityOnHand).toBe('25')
  })
})
