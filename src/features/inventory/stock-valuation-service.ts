import Decimal from 'decimal.js'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRecord,
  StockBalanceRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type StockValuationRow = {
  itemId: string
  itemName: string
  unit: string
  quantity: string
  avgRate: string
  stockValue: string
  tracksInventory: boolean
}

/** Moving-average unit cost of a balance (value ÷ quantity). */
export function averageRate(balance: StockBalanceRecord): string {
  const quantity = new Decimal(balance.quantity || '0')
  if (quantity.lte(0)) {
    return '0.00'
  }

  return new Decimal(balance.value || '0').div(quantity).toFixed(2)
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

      return {
        itemId: balance.itemId,
        itemName: item?.name ?? 'Unknown item',
        unit: item?.baseUnit ?? '',
        quantity: balance.quantity,
        avgRate: averageRate(balance),
        stockValue: new Decimal(balance.value || '0').toFixed(2),
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
