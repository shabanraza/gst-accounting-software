import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { commitImportOpeningStock } from '#/features/imports/import-commit-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'

describe('commitImportOpeningStock', () => {
  test('books imported opening stock at quantity × rate against Opening Balance', async () => {
    const ledgers = new InMemoryLedgerAccountRepository()
    const chart = await setupDefaultChartOfAccounts(ledgers, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })
    const accountId = (key: string) =>
      chart.find((account) => account.systemKey === key)!.id
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()
    const posting = new InMemoryLedgerPostingRepository()

    const result = await commitImportOpeningStock(
      { items, stock, posting, ledgers },
      {
        companyId: 'company-1',
        occurredOn: '2026-04-01',
        rows: [
          {
            itemName: 'Cotton Fabric',
            quantity: '10',
            unit: 'MTR',
            rate: '75.50',
          },
        ],
      },
    )

    expect(result.createdCount).toBe(1)
    const [item] = await items.listByCompanyId('company-1')
    expect(await stock.getValue('company-1', item.id)).toBe('755.00')
    const [entry] = posting.list()
    expect(entry.lines).toEqual([
      expect.objectContaining({
        ledgerAccountId: accountId('stock_in_hand'),
        debit: '755.00',
      }),
      expect.objectContaining({
        ledgerAccountId: accountId('opening_balance'),
        credit: '755.00',
      }),
    ])
  })
})
