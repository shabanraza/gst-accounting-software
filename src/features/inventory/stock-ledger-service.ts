import Decimal from 'decimal.js'

import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type StockLedgerRow = {
  movementId: string
  occurredOn: string
  movementType: string
  direction: 'in' | 'out'
  quantity: string
  runningBalance: string
  godownName: string | null
}

export type StockLedgerReport = {
  itemId: string
  rows: Array<StockLedgerRow>
  closingBalance: string
}

export async function buildStockLedger(
  deps: { movements: StockMovementRepository },
  companyId: string,
  itemId: string,
): Promise<StockLedgerReport> {
  const movements = await deps.movements.listByCompanyId(companyId, { itemId })
  const itemMovements = movements.sort(
    (left, right) =>
      left.occurredOn.localeCompare(right.occurredOn) ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  )

  let runningBalance = new Decimal(0)
  const rows: Array<StockLedgerRow> = itemMovements.map((movement) => {
    const quantity = new Decimal(movement.quantity)
    runningBalance =
      movement.direction === 'in'
        ? runningBalance.plus(quantity)
        : runningBalance.minus(quantity)

    return {
      movementId: movement.id,
      occurredOn: movement.occurredOn,
      movementType: movement.movementType,
      direction: movement.direction,
      quantity: movement.quantity,
      runningBalance: runningBalance.toString(),
      godownName: movement.godownName,
    }
  })

  return {
    itemId,
    rows,
    closingBalance: runningBalance.toString(),
  }
}

export type StockSummaryRow = {
  itemId: string
  itemName: string
  baseUnit: string
  quantityOnHand: string
}

export async function buildStockSummary(
  deps: { balances: StockBalanceRepository; items: ItemRepository },
  companyId: string,
): Promise<Array<StockSummaryRow>> {
  const [balances, items] = await Promise.all([
    deps.balances.listBalancesByCompany(companyId),
    deps.items.listByCompanyId(companyId),
  ])
  const itemById = new Map(items.map((item) => [item.id, item]))

  return balances.map((balance) => {
    const item = itemById.get(balance.itemId)
    return {
      itemId: balance.itemId,
      itemName: item?.name ?? 'Unknown item',
      baseUnit: item?.baseUnit ?? '',
      quantityOnHand: balance.quantity,
    }
  })
}
