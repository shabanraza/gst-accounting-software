import Decimal from 'decimal.js'

export type StockLevelInput = {
  quantity: string | null | undefined
  reorderLevel: string | null | undefined
  tracksInventory: boolean
}

/** `''`, `null` and unparseable values all mean "no quantity". */
export function toStockQuantity(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !Number.isFinite(Number(trimmed))) return new Decimal(0)
  return new Decimal(trimmed)
}

/**
 * The dashboard low-stock rule: a tracked item at or below its reorder level.
 * An item with no reorder level carries no threshold and so is never low here.
 */
export function isAtOrBelowReorderLevel(input: StockLevelInput) {
  if (!input.tracksInventory) return false
  const reorderLevel = toStockQuantity(input.reorderLevel)
  if (reorderLevel.lte(0)) return false
  return toStockQuantity(input.quantity).lte(reorderLevel)
}

/** Low by reorder level, or out of stock when the item has no reorder level. */
export function needsRestock(input: StockLevelInput) {
  if (!input.tracksInventory) return false
  return (
    isAtOrBelowReorderLevel(input) || toStockQuantity(input.quantity).lte(0)
  )
}
