import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import {
  commitImportItems,
  commitImportOpeningStock,
} from '#/features/imports/import-commit-service.ts'
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

describe('commitImportItems', () => {
  test('keeps the GST rate and HSN from the file', async () => {
    const items = new InMemoryItemRepository()

    await commitImportItems(items, {
      companyId: 'company-1',
      rows: [
        { name: 'Cotton Yarn', hsn: '52051200', gstRate: '5', rate: '80.00', unit: 'Kg' },
      ],
    })

    const [item] = await items.listByCompanyId('company-1')
    expect(item).toMatchObject({ hsnCode: '52051200', gstRate: '5.00' })
  })
})

describe('commitImportOpeningStock with existing items', () => {
  test('adds stock to an item that already exists instead of creating a duplicate', async () => {
    const ledgers = new InMemoryLedgerAccountRepository()
    await setupDefaultChartOfAccounts(ledgers, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()
    const posting = new InMemoryLedgerPostingRepository()
    await commitImportItems(items, {
      companyId: 'company-1',
      rows: [{ name: 'Cotton Yarn', hsn: '5205', gstRate: '5', rate: '80.00', unit: 'Kg' }],
    })

    await commitImportOpeningStock(
      { items, stock, posting, ledgers },
      {
        companyId: 'company-1',
        occurredOn: '2026-04-01',
        rows: [{ itemName: ' cotton  yarn', quantity: '10', unit: 'Kg', rate: '80.00' }],
      },
    )

    const list = await items.listByCompanyId('company-1')
    expect(list).toHaveLength(1)
    expect(await stock.getBalance('company-1', list[0].id)).toBe('10')
  })

  test('creates new items with the HSN and GST rate from the file', async () => {
    const ledgers = new InMemoryLedgerAccountRepository()
    await setupDefaultChartOfAccounts(ledgers, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })
    const items = new InMemoryItemRepository()

    await commitImportOpeningStock(
      {
        items,
        stock: new InMemoryStockStore(),
        posting: new InMemoryLedgerPostingRepository(),
        ledgers,
      },
      {
        companyId: 'company-1',
        occurredOn: '2026-04-01',
        rows: [
          { itemName: 'Thread', quantity: '4', unit: 'Box', rate: '62.50', hsn: '5204', gstRate: '12' },
        ],
      },
    )

    const [item] = await items.listByCompanyId('company-1')
    expect(item).toMatchObject({ hsnCode: '5204', gstRate: '12.00' })
  })
})
