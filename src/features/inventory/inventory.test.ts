import { describe, expect, test } from 'vitest'

import { createItem, updateItem } from '#/features/inventory/item-service.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import {
  InsufficientStockError,
  getCurrentStock,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'
import type {
  StockMovementRecord,
  StockMovementRepository,
  StockBalanceRepository,
} from '#/features/inventory/stock-movement-service.ts'

class InMemoryItemRepository implements ItemRepository {
  private items: Array<ItemRecord> = []

  async create(item: ItemRecord) {
    this.items.push(item)
    return item
  }

  async update(item: ItemRecord) {
    const index = this.items.findIndex((entry) => entry.id === item.id)
    if (index === -1) {
      throw new Error(`Item not found: ${item.id}`)
    }
    this.items[index] = item
    return item
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }

  async listByCompanyId(companyId: string) {
    return this.items.filter((item) => item.companyId === companyId)
  }

  list() {
    return this.items
  }
}

class InMemoryStockRepositories
  implements StockMovementRepository, StockBalanceRepository
{
  private movements: Array<StockMovementRecord> = []
  private balances = new Map<string, string>()

  private key(companyId: string, itemId: string) {
    return `${companyId}:${itemId}`
  }

  async createMovement(movement: StockMovementRecord) {
    this.movements.push(movement)
    return movement
  }

  async listByCompanyId(companyId: string) {
    return this.movements.filter((movement) => movement.companyId === companyId)
  }

  async getBalance(companyId: string, itemId: string) {
    return this.balances.get(this.key(companyId, itemId)) ?? '0'
  }

  async setBalance(companyId: string, itemId: string, quantity: string) {
    this.balances.set(this.key(companyId, itemId), quantity)
  }

  async listBalancesByCompany(companyId: string) {
    return [...this.balances.entries()]
      .filter(([key]) => key.startsWith(`${companyId}:`))
      .map(([key, quantity]) => ({
        companyId,
        itemId: key.slice(companyId.length + 1),
        quantity,
      }))
  }

  listMovements() {
    return this.movements
  }
}

describe('createItem', () => {
  test('creates an item with HSN, GST rate, base unit, purchase rate, and sale rate', async () => {
    const repository = new InMemoryItemRepository()

    const item = await createItem(repository, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    expect(item.name).toBe('Cotton Fabric')
    expect(item.hsnCode).toBe('5208')
    expect(item.gstRate).toBe('5.00')
    expect(item.baseUnit).toBe('meter')
    expect(item.purchaseRate).toBe('80.00')
    expect(item.saleRate).toBe('120.00')
    expect(item.companyId).toBe('company-1')
    expect(item.alias).toBe('')
    expect(item.itemGroup).toBe('')
    expect(item.alternateUnit).toBe('')
    expect(item.conversionFactor).toBe('1')
    expect(item.mrp).toBe('0.00')
    expect(item.reorderLevel).toBe('0')
  })

  test('persists alias, group, alternate unit, MRP, and reorder level when provided', async () => {
    const repository = new InMemoryItemRepository()

    const item = await createItem(repository, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      alias: 'CTN-FAB',
      itemGroup: 'Fabrics',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      alternateUnit: 'Thaan',
      conversionFactor: '50',
      mrp: '150.00',
      reorderLevel: '20',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    expect(item.alias).toBe('CTN-FAB')
    expect(item.itemGroup).toBe('Fabrics')
    expect(item.alternateUnit).toBe('Thaan')
    expect(item.conversionFactor).toBe('50')
    expect(item.mrp).toBe('150.00')
    expect(item.reorderLevel).toBe('20')
  })
})

describe('updateItem', () => {
  test('updates an existing item master record', async () => {
    const repository = new InMemoryItemRepository()

    const item = await createItem(repository, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    const updated = await updateItem(repository, {
      companyId: 'company-1',
      itemId: item.id,
      name: 'Premium Cotton',
      alias: 'CTN-PREM',
      itemGroup: 'Fabrics',
      hsnCode: '5209',
      gstRate: '12.00',
      baseUnit: 'meter',
      purchaseRate: '90.00',
      saleRate: '140.00',
      tracksInventory: true,
    })

    expect(updated.name).toBe('Premium Cotton')
    expect(updated.hsnCode).toBe('5209')
    expect(updated.saleRate).toBe('140.00')
  })

  test('rejects cross-company item updates', async () => {
    const repository = new InMemoryItemRepository()

    const item = await createItem(repository, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    await expect(
      updateItem(repository, {
        companyId: 'company-2',
        itemId: item.id,
        name: 'Premium Cotton',
        hsnCode: '5209',
        gstRate: '12.00',
        baseUnit: 'meter',
        purchaseRate: '90.00',
        saleRate: '140.00',
        tracksInventory: true,
      }),
    ).rejects.toThrow(/Item not found/)
  })
})

describe('stock movements', () => {
  test('stock can only change through stock movement records', async () => {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockRepositories()

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

    await recordStockMovement(stock, stock, {
      companyId: 'company-1',
      itemId: item.id,
      movementType: 'purchase_in',
      quantity: '100',
      unit: 'meter',
      referenceType: 'purchase_bill',
      referenceId: 'bill-1',
      occurredOn: '2026-07-11',
    })

    expect(stock.listMovements()).toHaveLength(1)
    expect(await getCurrentStock(stock, 'company-1', item.id)).toBe('100')
  })

  test('records opening stock as a stock movement', async () => {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockRepositories()

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

    await recordStockMovement(stock, stock, {
      companyId: 'company-1',
      itemId: item.id,
      movementType: 'opening',
      quantity: '50',
      unit: 'meter',
      referenceType: 'opening_stock',
      referenceId: 'opening-1',
      occurredOn: '2026-04-01',
    })

    expect(await getCurrentStock(stock, 'company-1', item.id)).toBe('50')
    expect(stock.listMovements()[0]?.movementType).toBe('opening')
  })

  test('rejects stock-out that would make quantity negative', async () => {
    const stock = new InMemoryStockRepositories()

    await expect(
      recordStockMovement(stock, stock, {
        companyId: 'company-1',
        itemId: 'item-1',
        movementType: 'sale_out',
        quantity: '10',
        unit: 'meter',
        referenceType: 'sales_invoice',
        referenceId: 'inv-1',
        occurredOn: '2026-07-11',
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError)
  })
})
