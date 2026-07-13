import { createItem } from '#/features/inventory/item-service.ts'
import { DEFAULT_OPENING_STOCK_QUANTITY } from '#/features/inventory/opening-stock.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type {
  CreateItemInput,
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRecord,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type CreateItemWithOpeningInput = CreateItemInput & {
  openingQuantity?: string | null
  openingOccurredOn?: string
}

export type CreateItemWithOpeningResult = {
  item: ItemRecord
  openingMovement: StockMovementRecord | null
}

export async function createItemWithOpening(
  itemRepository: ItemRepository,
  stockStore: StockMovementRepository & StockBalanceRepository,
  input: CreateItemWithOpeningInput,
): Promise<CreateItemWithOpeningResult> {
  const { openingQuantity, openingOccurredOn, ...itemInput } = input
  const item = await createItem(itemRepository, itemInput)

  if (!item.tracksInventory) {
    return { item, openingMovement: null }
  }

  const trimmedQty = openingQuantity?.trim()
  const qty =
    trimmedQty && trimmedQty !== '0' && trimmedQty !== '0.00'
      ? trimmedQty
      : DEFAULT_OPENING_STOCK_QUANTITY

  const openingMovement = await recordStockMovement(stockStore, stockStore, {
    companyId: item.companyId,
    itemId: item.id,
    movementType: 'opening',
    quantity: qty,
    unit: item.baseUnit,
    referenceType: 'item_opening',
    referenceId: item.id,
    occurredOn: openingOccurredOn ?? new Date().toISOString().slice(0, 10),
  })

  return { item, openingMovement }
}
