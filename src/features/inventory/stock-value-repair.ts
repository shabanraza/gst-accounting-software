import Decimal from 'decimal.js'

import { openingStockValue } from '#/features/inventory/opening-stock-service.ts'

/**
 * One-time repair for companies whose stock predates value tracking: opening
 * stock that never reached the ledger, balances with no value, and the gap
 * left by COGS booked at the item master rate. See scripts/repair-stock-value.ts.
 */
export type StockValueRepairInput = {
  items: Array<{ id: string; name: string; purchaseRate: string }>
  /** Opening movements whose value is NULL (never posted to the ledger). */
  unvaluedOpenings: Array<{
    movementId: string
    itemId: string
    quantity: string
    occurredOn: string
    referenceType: string
  }>
  /** Stock balances whose value is NULL. */
  unvaluedBalances: Array<{ itemId: string; quantity: string }>
  /** Net debit of the Stock In Hand ledger before the repair. */
  bookStockBalance: string
  /** Sum of stock balance values that are already set. */
  valuedStockTotal: string
}

export type StockValueRepairPlan = {
  openingEntries: Array<{
    movementId: string
    itemId: string
    itemName: string
    quantity: string
    occurredOn: string
    value: string
    /** Created by an old version that seeded starter stock, not by a user. */
    seeded: boolean
  }>
  unpricedOpenings: Array<{
    movementId: string
    itemName: string
    quantity: string
  }>
  /** Legacy balances valued at quantity × item purchase rate. */
  balanceValues: Array<{ itemId: string; value: string }>
  /** Amount to debit (+) or credit (−) Stock In Hand against COGS. */
  reconciliation: string
}

export function planStockValueRepair(
  input: StockValueRepairInput,
): StockValueRepairPlan {
  const itemById = new Map(input.items.map((item) => [item.id, item]))
  const rateOf = (itemId: string) => itemById.get(itemId)?.purchaseRate ?? '0'
  const nameOf = (itemId: string) => itemById.get(itemId)?.name ?? itemId

  const openingEntries: StockValueRepairPlan['openingEntries'] = []
  const unpricedOpenings: StockValueRepairPlan['unpricedOpenings'] = []
  for (const opening of input.unvaluedOpenings) {
    const value = openingStockValue(opening.quantity, rateOf(opening.itemId))
    if (new Decimal(value).isZero()) {
      unpricedOpenings.push({
        movementId: opening.movementId,
        itemName: nameOf(opening.itemId),
        quantity: opening.quantity,
      })
      continue
    }
    openingEntries.push({
      movementId: opening.movementId,
      itemId: opening.itemId,
      itemName: nameOf(opening.itemId),
      quantity: opening.quantity,
      occurredOn: opening.occurredOn,
      value,
      seeded: opening.referenceType === 'starter_opening',
    })
  }

  const balanceValues = input.unvaluedBalances.map((balance) => ({
    itemId: balance.itemId,
    value: openingStockValue(balance.quantity, rateOf(balance.itemId)),
  }))

  const sum = (values: Array<string>) =>
    values.reduce((total, value) => total.plus(value), new Decimal(0))
  const bookAfter = new Decimal(input.bookStockBalance).plus(
    sum(openingEntries.map((entry) => entry.value)),
  )
  const valuation = new Decimal(input.valuedStockTotal).plus(
    sum(balanceValues.map((entry) => entry.value)),
  )

  return {
    openingEntries,
    unpricedOpenings,
    balanceValues,
    reconciliation: valuation.minus(bookAfter).toFixed(2),
  }
}
