import Decimal from 'decimal.js'

import type { StockMovementRecord } from '#/features/inventory/stock-movement-service.ts'

export type GodownStockRow = {
  itemId: string
  godownName: string
  quantity: string
}

type GodownMovement = Pick<
  StockMovementRecord,
  'itemId' | 'godownName' | 'direction' | 'quantity'
>

function formatQuantity(value: Decimal): string {
  return value
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

function foldTotals(
  movements: Array<GodownMovement>,
  defaultGodownName: string,
): Map<string, { itemId: string; godownName: string; quantity: Decimal }> {
  const totals = new Map<
    string,
    { itemId: string; godownName: string; quantity: Decimal }
  >()

  for (const movement of movements) {
    const godownName = movement.godownName ?? defaultGodownName
    const key = `${movement.itemId}\u0000${godownName}`
    const current = totals.get(key) ?? {
      itemId: movement.itemId,
      godownName,
      quantity: new Decimal(0),
    }
    const quantity = new Decimal(movement.quantity)
    current.quantity =
      movement.direction === 'in'
        ? current.quantity.plus(quantity)
        : current.quantity.minus(quantity)
    totals.set(key, current)
  }

  return totals
}

/**
 * Godown-wise stock per item, folded from stock movements. Movements recorded
 * without a godown belong to the default godown. Zero balances are left out.
 */
export function foldGodownStock(
  movements: Array<GodownMovement>,
  defaultGodownName: string,
): Array<GodownStockRow> {
  return [...foldTotals(movements, defaultGodownName).values()]
    .filter((row) => !row.quantity.isZero())
    .map((row) => ({
      itemId: row.itemId,
      godownName: row.godownName,
      quantity: formatQuantity(row.quantity),
    }))
    .sort(
      (left, right) =>
        left.itemId.localeCompare(right.itemId) ||
        left.godownName.localeCompare(right.godownName),
    )
}

/** Quantity of one item held in one godown. */
export function godownQuantity(
  movements: Array<GodownMovement>,
  itemId: string,
  godownName: string,
  defaultGodownName: string,
): string {
  const row = foldTotals(
    movements.filter((movement) => movement.itemId === itemId),
    defaultGodownName,
  ).get(`${itemId}\u0000${godownName}`)

  return formatQuantity(row?.quantity ?? new Decimal(0))
}
