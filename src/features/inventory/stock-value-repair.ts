import Decimal from 'decimal.js'

import { openingStockValue } from '#/features/inventory/opening-stock-service.ts'

/**
 * One-time repair for companies whose stock predates value tracking: opening
 * stock that never reached the ledger, balances with no value, and the gap
 * left by COGS booked at the item master rate. See scripts/repair-stock-value.ts.
 *
 * Old versions seeded starter stock and gave new items an invented opening
 * quantity of 100. Those openings are never booked: they are listed for the
 * owner to review or remove, and their company's books are not plugged.
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
    /** Date (YYYY-MM-DD) the movement row was created. */
    createdOn: string
  }>
  /** Stock balances whose value is NULL. */
  unvaluedBalances: Array<{ itemId: string; quantity: string }>
  /** Net debit of the Stock In Hand ledger before the repair. */
  bookStockBalance: string
  /** Sum of stock balance values that are already set. */
  valuedStockTotal: string
  /** Openings of exactly 100 created before this date may be invented. */
  legacyBefore: string
}

export type StockValueRepairPlan = {
  openingEntries: Array<{
    movementId: string
    itemId: string
    itemName: string
    quantity: string
    occurredOn: string
    value: string
  }>
  /** Seeded or possibly invented openings, left unposted for the owner. */
  needsReview: Array<{
    movementId: string
    itemName: string
    quantity: string
    referenceType: string
  }>
  unpricedOpenings: Array<{
    movementId: string
    itemName: string
    quantity: string
  }>
  /** Legacy balances valued at quantity × item purchase rate. */
  balanceValues: Array<{ itemId: string; value: string }>
  /**
   * Amount to debit (+) or credit (−) Stock In Hand against COGS; null while
   * any opening awaits review, since its stock is not real value to match.
   */
  reconciliation: string | null
}

function isSuspectOpening(
  opening: StockValueRepairInput['unvaluedOpenings'][number],
  legacyBefore: string,
): boolean {
  return (
    opening.referenceType === 'starter_opening' ||
    (new Decimal(opening.quantity).equals(100) &&
      opening.createdOn < legacyBefore)
  )
}

export function planStockValueRepair(
  input: StockValueRepairInput,
): StockValueRepairPlan {
  const itemById = new Map(input.items.map((item) => [item.id, item]))
  const rateOf = (itemId: string) => itemById.get(itemId)?.purchaseRate ?? '0'
  const nameOf = (itemId: string) => itemById.get(itemId)?.name ?? itemId

  const openingEntries: StockValueRepairPlan['openingEntries'] = []
  const needsReview: StockValueRepairPlan['needsReview'] = []
  const unpricedOpenings: StockValueRepairPlan['unpricedOpenings'] = []
  const suspectItemIds = new Set<string>()
  for (const opening of input.unvaluedOpenings) {
    if (isSuspectOpening(opening, input.legacyBefore)) {
      suspectItemIds.add(opening.itemId)
      needsReview.push({
        movementId: opening.movementId,
        itemName: nameOf(opening.itemId),
        quantity: opening.quantity,
        referenceType: opening.referenceType,
      })
      continue
    }

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
    })
  }

  const balanceValues = input.unvaluedBalances
    .filter((balance) => !suspectItemIds.has(balance.itemId))
    .map((balance) => ({
      itemId: balance.itemId,
      value: openingStockValue(balance.quantity, rateOf(balance.itemId)),
    }))

  if (needsReview.length > 0) {
    return {
      openingEntries,
      needsReview,
      unpricedOpenings,
      balanceValues,
      reconciliation: null,
    }
  }

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
    needsReview,
    unpricedOpenings,
    balanceValues,
    reconciliation: valuation.minus(bookAfter).toFixed(2),
  }
}
