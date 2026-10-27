import { openPooledDb } from '#/db/client.ts'
import { DrizzleLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { DrizzleDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import {
  DrizzleItemRepository,
  DrizzleStockStore,
} from '#/features/inventory/inventory-store.ts'
import { DrizzlePartyRepository } from '#/features/parties/party-store.ts'
import { DrizzlePurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { DrizzleSalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { PooledDatabase } from '#/db/client.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type PostingRepositories = {
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  posting: LedgerPostingRepository
  stock: StockMovementRepository & StockBalanceRepository
  items: ItemRepository
  parties: PartyRepository
  dashboard: DashboardSummaryRepository
}

/** Runs accounting writes (document, ledger, stock, summaries) as one unit. */
export type PostingTransaction = <T>(
  work: (repositories: PostingRepositories) => Promise<T>,
) => Promise<T>

/**
 * With a database, each call opens a per-request pool and runs `work` in a
 * single Postgres transaction. Without one (dev/tests), `work` runs against
 * the in-memory fallback repositories.
 */
export function createPostingTransaction(
  fallback: PostingRepositories,
  openDatabase: () => PooledDatabase | null = openPooledDb,
): PostingTransaction {
  return async (work) => {
    const pooled = openDatabase()
    if (!pooled) {
      return work(fallback)
    }

    try {
      return await pooled.database.transaction((tx) =>
        work({
          invoices: new DrizzleSalesInvoiceRepository(tx),
          bills: new DrizzlePurchaseBillRepository(tx),
          posting: new DrizzleLedgerPostingRepository(tx),
          stock: new DrizzleStockStore(tx),
          items: new DrizzleItemRepository(tx),
          parties: new DrizzlePartyRepository(tx),
          dashboard: new DrizzleDashboardSummaryRepository(tx),
        }),
      )
    } finally {
      await pooled.close()
    }
  }
}
