import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { seedCompanyStarterData } from '#/features/companies/company-starter-data-service.ts'
import { ensureInventoryOpeningStock } from '#/features/inventory/opening-stock.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { getCurrentStock } from '#/features/inventory/stock-movement-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'

describe('company starter data', () => {
  test('seeds demo parties, items, godowns, and opening stock', async () => {
    const ledgers = new InMemoryLedgerAccountRepository()
    const parties = new InMemoryPartyRepository()
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()
    const godowns = new InMemoryGodownRepository()
    const companyId = 'company-1'

    const ledgerAccounts = await setupDefaultChartOfAccounts(ledgers, {
      companyId,
      businessType: 'wholesale',
    })
    const ledgerBySystemKey = Object.fromEntries(
      ledgerAccounts
        .filter((ledger) => ledger.systemKey)
        .map((ledger) => [ledger.systemKey, ledger.id]),
    ) as Record<string, string>

    const result = await seedCompanyStarterData(
      { parties, items, stock, godowns },
      {
        companyId,
        financialYearStart: '2026-04-01',
        ledgerBySystemKey,
      },
    )

    expect(result.parties.length).toBeGreaterThanOrEqual(3)
    expect(result.items.length).toBeGreaterThanOrEqual(2)

    const fabricItem = result.items.find(
      (item) => item.name === 'Cotton Fabric',
    )
    expect(fabricItem).toBeTruthy()

    const balance = await getCurrentStock(stock, companyId, fabricItem!.id)
    expect(balance).toBe('100')

    const godownNames = (await godowns.listByCompanyId(companyId)).map(
      (entry) => entry.name,
    )
    expect(godownNames).toContain('Main Godown')
    expect(godownNames).toContain('Showroom')
  })

  test('backfills opening stock for existing items with zero balance', async () => {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()
    const companyId = 'company-2'

    const item = await createItem(items, {
      companyId,
      name: 'Manual Item',
      hsnCode: '5208',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    await ensureInventoryOpeningStock(items, stock, {
      companyId,
      occurredOn: '2026-04-01',
    })

    const balance = await getCurrentStock(stock, companyId, item.id)
    expect(balance).toBe('100')
  })
})
