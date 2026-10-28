import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createItemWithOpening } from '#/features/inventory/create-item-with-opening.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { getCurrentStock } from '#/features/inventory/stock-movement-service.ts'

async function openingContext() {
  const ledgers = new InMemoryLedgerAccountRepository()
  const chart = await setupDefaultChartOfAccounts(ledgers, {
    companyId: 'company-1',
    businessType: 'wholesale',
  })
  const accountId = (key: string) =>
    chart.find((account) => account.systemKey === key)!.id
  const posting = new InMemoryLedgerPostingRepository()

  return {
    deps: {
      items: new InMemoryItemRepository(),
      stock: new InMemoryStockStore(),
      posting,
      ledgers,
    },
    posting,
    stockAccountId: accountId('stock_in_hand'),
    openingBalanceAccountId: accountId('opening_balance'),
  }
}

const fabric = {
  companyId: 'company-1',
  name: 'Cotton Fabric',
  hsnCode: '5208',
  gstRate: '5.00',
  baseUnit: 'Meter',
  purchaseRate: '80.00',
  saleRate: '120.00',
  tracksInventory: true,
}

describe('createItemWithOpening', () => {
  test('creates item and posts opening stock movement when qty provided', async () => {
    const { deps } = await openingContext()

    const result = await createItemWithOpening(deps, {
      ...fabric,
      openingQuantity: '50',
      openingOccurredOn: '2026-04-01',
    })

    expect(result.item.name).toBe('Cotton Fabric')
    expect(result.openingMovement?.movementType).toBe('opening')
    expect(await getCurrentStock(deps.stock, 'company-1', result.item.id)).toBe(
      '50',
    )
  })

  test('values opening stock at the purchase rate and books it against Opening Balance', async () => {
    const { deps, posting, stockAccountId, openingBalanceAccountId } =
      await openingContext()

    const result = await createItemWithOpening(deps, {
      ...fabric,
      openingQuantity: '50',
      openingOccurredOn: '2026-04-01',
    })

    expect(result.openingMovement?.value).toBe('4000.00')
    expect(await deps.stock.getValue('company-1', result.item.id)).toBe(
      '4000.00',
    )
    const [entry] = posting.list()
    expect(entry.entryDate).toBe('2026-04-01')
    expect(entry.lines).toEqual([
      expect.objectContaining({
        ledgerAccountId: stockAccountId,
        debit: '4000.00',
        credit: '0.00',
      }),
      expect.objectContaining({
        ledgerAccountId: openingBalanceAccountId,
        debit: '0.00',
        credit: '4000.00',
      }),
    ])
  })

  test('posts no ledger entry when opening stock has no rate', async () => {
    const { deps, posting } = await openingContext()

    const result = await createItemWithOpening(deps, {
      ...fabric,
      purchaseRate: '0.00',
      openingQuantity: '5',
    })

    expect(result.openingMovement?.value).toBe('0.00')
    expect(posting.list()).toEqual([])
  })

  test.each([undefined, '', '0', '0.00'])(
    'records no opening stock when opening qty is %j',
    async (openingQuantity) => {
      const { deps, posting } = await openingContext()

      const result = await createItemWithOpening(deps, {
        ...fabric,
        openingQuantity,
      })

      expect(result.openingMovement).toBeNull()
      expect(await deps.stock.listByCompanyId('company-1')).toEqual([])
      expect(
        await getCurrentStock(deps.stock, 'company-1', result.item.id),
      ).toBe('0')
      expect(posting.list()).toEqual([])
    },
  )

  test('skips opening movement for service items', async () => {
    const { deps } = await openingContext()

    const result = await createItemWithOpening(deps, {
      ...fabric,
      name: 'Cutting Service',
      tracksInventory: false,
      openingQuantity: '10',
    })

    expect(result.openingMovement).toBeNull()
  })

  test('refuses opening stock when the company has no Opening Balance ledger', async () => {
    const { deps } = await openingContext()

    await expect(
      createItemWithOpening(
        { ...deps, ledgers: new InMemoryLedgerAccountRepository() },
        { ...fabric, openingQuantity: '5' },
      ),
    ).rejects.toThrow('Opening Balance')
  })
})
