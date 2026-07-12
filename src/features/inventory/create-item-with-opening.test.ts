import { describe, expect, test } from 'vitest'

import { createItemWithOpening } from '#/features/inventory/create-item-with-opening.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import { getCurrentStock } from '#/features/inventory/stock-movement-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRecord,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

class InMemoryItemRepository implements ItemRepository {
  private items: Array<ItemRecord> = []

  async create(item: ItemRecord) {
    this.items.push(item)
    return item
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }

  async listByCompanyId(companyId: string) {
    return this.items.filter((item) => item.companyId === companyId)
  }
}

class InMemoryStockStore
  implements StockMovementRepository, StockBalanceRepository
{
  private balances = new Map<string, string>()
  private movements: Array<StockMovementRecord> = []

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
}

describe('createItemWithOpening', () => {
  test('creates item and posts opening stock movement when qty provided', async () => {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()

    const result = await createItemWithOpening(items, stock, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'Meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
      openingQuantity: '50',
      openingOccurredOn: '2026-04-01',
    })

    expect(result.item.name).toBe('Cotton Fabric')
    expect(result.openingMovement?.movementType).toBe('opening')
    expect(await getCurrentStock(stock, 'company-1', result.item.id)).toBe('50')
  })

  test('skips opening movement for service items or blank qty', async () => {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()

    const result = await createItemWithOpening(items, stock, {
      companyId: 'company-1',
      name: 'Cutting Service',
      hsnCode: '9988',
      gstRate: '18.00',
      baseUnit: 'Job',
      purchaseRate: '0.00',
      saleRate: '500.00',
      tracksInventory: false,
      openingQuantity: '10',
    })

    expect(result.openingMovement).toBeNull()
  })
})
