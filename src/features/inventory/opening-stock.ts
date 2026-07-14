import Decimal from 'decimal.js'

import { listItemsByCompany } from '#/features/inventory/item-service.ts'
import {
  getCurrentStock,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'

import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export const DEFAULT_OPENING_STOCK_QUANTITY = '100'

export async function ensureOpeningStockForItemIds(
  items: ItemRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  input: {
    companyId: string
    itemIds: Array<string>
    occurredOn: string
    quantity?: string
  },
) {
  const quantity = input.quantity ?? DEFAULT_OPENING_STOCK_QUANTITY
  const uniqueIds = [...new Set(input.itemIds)]

  for (const itemId of uniqueIds) {
    const item = await items.findById(itemId)
    if (!item || item.companyId !== input.companyId || !item.tracksInventory) {
      continue
    }

    const balance = await getCurrentStock(stock, input.companyId, item.id)
    if (new Decimal(balance).gt(0)) {
      continue
    }

    await recordStockMovement(stock, stock, {
      companyId: input.companyId,
      itemId: item.id,
      movementType: 'opening',
      quantity,
      unit: item.baseUnit,
      referenceType: 'starter_opening',
      referenceId: item.id,
      occurredOn: input.occurredOn,
    })
  }
}

export async function ensureInventoryOpeningStock(
  items: ItemRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  input: {
    companyId: string
    occurredOn: string
    quantity?: string
  },
) {
  const itemList = await listItemsByCompany(items, input.companyId)

  await ensureOpeningStockForItemIds(items, stock, {
    companyId: input.companyId,
    itemIds: itemList.map((item) => item.id),
    occurredOn: input.occurredOn,
    quantity: input.quantity,
  })
}
