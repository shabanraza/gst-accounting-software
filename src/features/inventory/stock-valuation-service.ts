import Decimal from 'decimal.js'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { StockBalanceRepository } from '#/features/inventory/stock-movement-service.ts'

export type StockValuationRow = {
  itemId: string
  itemName: string
  unit: string
  quantity: string
  avgRate: string
  stockValue: string
  tracksInventory: boolean
}

export async function buildStockValuation(
  deps: {
    balances: StockBalanceRepository
    items: {
      listByCompanyId: (companyId: string) => Promise<Array<ItemRecord>>
    }
  },
  companyId: string,
): Promise<Array<StockValuationRow>> {
  const [items, balances] = await Promise.all([
    deps.items.listByCompanyId(companyId),
    deps.balances.listBalancesByCompany(companyId),
  ])
  const itemById = new Map(items.map((item) => [item.id, item]))

  return balances
    .map((balance) => {
      const item = itemById.get(balance.itemId)
      const avgRate = item?.purchaseRate ?? '0.00'
      const stockValue = new Decimal(balance.quantity || '0')
        .times(avgRate)
        .toFixed(2)

      return {
        itemId: balance.itemId,
        itemName: item?.name ?? 'Unknown item',
        unit: item?.baseUnit ?? '',
        quantity: balance.quantity,
        avgRate,
        stockValue,
        tracksInventory: item?.tracksInventory ?? true,
      }
    })
    .filter((row) => row.tracksInventory && Number(row.quantity) !== 0)
    .sort((left, right) => left.itemName.localeCompare(right.itemName))
}

export function totalStockValue(rows: Array<StockValuationRow>): string {
  return rows
    .reduce((sum, row) => sum.plus(row.stockValue || '0'), new Decimal(0))
    .toFixed(2)
}
