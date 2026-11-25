import { createItem } from '#/features/inventory/item-service.ts'
import {
  postOpeningStock,
  resolveOpeningStockAccounts,
} from '#/features/inventory/opening-stock-service.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
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

export type CreateItemWithOpeningDependencies = {
  items: ItemRepository
  stock: StockMovementRepository & StockBalanceRepository
  posting: LedgerPostingRepository
  ledgers: LedgerAccountRepository
}

/** Opening stock is valued at the item's purchase rate. */
export async function createItemWithOpening(
  deps: CreateItemWithOpeningDependencies,
  input: CreateItemWithOpeningInput,
): Promise<CreateItemWithOpeningResult> {
  const { openingQuantity, openingOccurredOn, ...itemInput } = input
  const qty = openingQuantity?.trim()
  const hasOpening = itemInput.tracksInventory && !!qty && Number(qty) !== 0
  const accounts = hasOpening
    ? await resolveOpeningStockAccounts(deps.ledgers, itemInput.companyId)
    : null

  const item = await createItem(deps.items, itemInput)

  if (!accounts || !qty) {
    return { item, openingMovement: null }
  }

  const { movement } = await postOpeningStock(deps, {
    ...accounts,
    companyId: item.companyId,
    itemId: item.id,
    itemName: item.name,
    unit: item.baseUnit,
    quantity: qty,
    rate: item.purchaseRate,
    occurredOn: openingOccurredOn ?? new Date().toISOString().slice(0, 10),
    referenceType: 'item_opening',
    referenceId: item.id,
  })

  return { item, openingMovement: movement }
}
