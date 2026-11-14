import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createGodown } from '#/features/inventory/godown-service.ts'
import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'
import { godownQuantity } from '#/features/inventory/godown-stock-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import {
  InsufficientStockError,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'
import {
  InvalidStockJournalError,
  postGodownTransfer,
  postStockAdjustment,
} from '#/features/inventory/stock-journal-service.ts'

const companyId = 'company-1'

async function journalContext() {
  const ledgers = new InMemoryLedgerAccountRepository()
  const chart = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const financialYears = new InMemoryFinancialYearRepository()
  await createFinancialYear(financialYears, {
    companyId,
    startDate: '2026-04-01',
  })
  const godowns = new InMemoryGodownRepository()
  await createGodown(godowns, { companyId, name: 'Main', isDefault: true })
  await createGodown(godowns, { companyId, name: 'Shop' })

  const items = new InMemoryItemRepository()
  const stock = new InMemoryStockStore()
  const item = await createItem(items, {
    companyId,
    name: 'Cotton Fabric',
    hsnCode: '5208',
    gstRate: '5.00',
    baseUnit: 'Meter',
    purchaseRate: '80.00',
    saleRate: '120.00',
    tracksInventory: true,
  })
  // 10 m at 100 = 1000.00 in the default godown (no godown name).
  await recordStockMovement(stock, stock, {
    companyId,
    itemId: item.id,
    movementType: 'purchase_in',
    quantity: '10',
    unit: 'Meter',
    referenceType: 'purchase_bill',
    referenceId: 'bill-1',
    occurredOn: '2026-05-01',
    value: '1000.00',
  })

  const posting = new InMemoryLedgerPostingRepository()
  const accountId = (key: string) =>
    chart.find((account) => account.systemKey === key)!.id

  return {
    deps: {
      stock,
      posting,
      sequences: new InMemoryDocumentSequenceRepository(),
      items,
      ledgers,
      financialYears,
      godowns,
    },
    item,
    stock,
    posting,
    stockInHandId: accountId('stock_in_hand'),
    stockAdjustmentId: accountId('stock_adjustment'),
  }
}

describe('postStockAdjustment', () => {
  test('damage writes adjustment_out at moving average and posts the loss', async () => {
    const context = await journalContext()

    const result = await postStockAdjustment(context.deps, {
      companyId,
      date: '2026-05-10',
      godownName: 'Main',
      reason: 'damage',
      lines: [{ itemId: context.item.id, quantity: '3' }],
    })

    expect(result.documentNumber).toBe('SJ-0001')
    expect(result.movements).toHaveLength(1)
    expect(result.movements[0]).toMatchObject({
      movementType: 'adjustment_out',
      direction: 'out',
      quantity: '3',
      value: '300.00',
      godownName: 'Main',
      referenceType: 'stock_journal',
      referenceId: 'SJ-0001',
    })
    expect(await context.stock.getBalance(companyId, context.item.id)).toBe('7')
    expect(await context.stock.getValue(companyId, context.item.id)).toBe(
      '700.00',
    )

    const entry = result.ledgerEntry!
    expect(entry.totalDebit).toBe('300.00')
    expect(entry.totalCredit).toBe('300.00')
    expect(entry.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ledgerAccountId: context.stockAdjustmentId,
          debit: '300.00',
          credit: '0.00',
        }),
        expect.objectContaining({
          ledgerAccountId: context.stockInHandId,
          debit: '0.00',
          credit: '300.00',
        }),
      ]),
    )
  })

  test('physical count gain comes in at moving average and credits stock adjustment', async () => {
    const context = await journalContext()

    const result = await postStockAdjustment(context.deps, {
      companyId,
      date: '2026-05-10',
      godownName: 'Main',
      reason: 'physical_count',
      lines: [{ itemId: context.item.id, quantity: '12' }],
    })

    expect(result.lines).toEqual([
      {
        itemId: context.item.id,
        bookQuantity: '10',
        countedQuantity: '12',
        difference: '2',
      },
    ])
    expect(result.movements[0]).toMatchObject({
      movementType: 'adjustment',
      direction: 'in',
      quantity: '2',
      value: '200.00',
    })
    expect(await context.stock.getBalance(companyId, context.item.id)).toBe(
      '12',
    )
    expect(result.ledgerEntry!.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ledgerAccountId: context.stockInHandId,
          debit: '200.00',
        }),
        expect.objectContaining({
          ledgerAccountId: context.stockAdjustmentId,
          credit: '200.00',
        }),
      ]),
    )
  })

  test('physical count shortfall posts a loss and the count is per godown', async () => {
    const context = await journalContext()

    const result = await postStockAdjustment(context.deps, {
      companyId,
      date: '2026-05-10',
      godownName: 'Main',
      reason: 'physical_count',
      lines: [{ itemId: context.item.id, quantity: '6' }],
    })

    expect(result.movements[0]).toMatchObject({
      movementType: 'adjustment_out',
      quantity: '4',
      value: '400.00',
    })
    expect(result.ledgerEntry!.totalDebit).toBe('400.00')
  })

  test('a write-off cannot take the godown below zero', async () => {
    const context = await journalContext()

    await expect(
      postStockAdjustment(context.deps, {
        companyId,
        date: '2026-05-10',
        godownName: 'Shop',
        reason: 'shrinkage',
        lines: [{ itemId: context.item.id, quantity: '1' }],
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError)
    await expect(
      postStockAdjustment(context.deps, {
        companyId,
        date: '2026-05-10',
        godownName: 'Main',
        reason: 'damage',
        lines: [{ itemId: context.item.id, quantity: '11' }],
      }),
    ).rejects.toThrow(/Insufficient stock for Cotton Fabric in Main/)
    expect(await context.stock.getBalance(companyId, context.item.id)).toBe(
      '10',
    )
    expect(await context.posting.listByCompanyId(companyId)).toHaveLength(0)
  })

  test('a count matching the book stock is rejected as nothing to post', async () => {
    const context = await journalContext()

    await expect(
      postStockAdjustment(context.deps, {
        companyId,
        date: '2026-05-10',
        godownName: 'Main',
        reason: 'physical_count',
        lines: [{ itemId: context.item.id, quantity: '10' }],
      }),
    ).rejects.toBeInstanceOf(InvalidStockJournalError)
  })

  test('creates the stock adjustment ledger for a company set up before it existed', async () => {
    const context = await journalContext()
    const legacy = new InMemoryLedgerAccountRepository()
    await legacy.createMany(
      (await context.deps.ledgers.listByCompanyId(companyId)).filter(
        (account) => account.systemKey !== 'stock_adjustment',
      ),
    )

    const result = await postStockAdjustment(
      { ...context.deps, ledgers: legacy },
      {
        companyId,
        date: '2026-05-10',
        godownName: 'Main',
        reason: 'other',
        lines: [{ itemId: context.item.id, quantity: '1' }],
      },
    )

    const created = (await legacy.listByCompanyId(companyId)).find(
      (account) => account.systemKey === 'stock_adjustment',
    )
    expect(created).toBeDefined()
    expect(
      result.ledgerEntry!.lines.map((line) => line.ledgerAccountId),
    ).toContain(created!.id)
  })

  test('numbers stock journals from the document sequence', async () => {
    const context = await journalContext()
    const input = {
      companyId,
      date: '2026-05-10',
      godownName: 'Main',
      reason: 'damage' as const,
      lines: [{ itemId: context.item.id, quantity: '1' }],
    }

    const first = await postStockAdjustment(context.deps, input)
    const second = await postStockAdjustment(context.deps, input)
    const transfer = await postGodownTransfer(context.deps, {
      companyId,
      date: '2026-05-11',
      fromGodown: 'Main',
      toGodown: 'Shop',
      lines: [{ itemId: context.item.id, quantity: '1' }],
    })

    expect([
      first.documentNumber,
      second.documentNumber,
      transfer.documentNumber,
    ]).toEqual(['SJ-0001', 'SJ-0002', 'SJ-0003'])
  })

  test('rejects an unknown godown', async () => {
    const context = await journalContext()

    await expect(
      postStockAdjustment(context.deps, {
        companyId,
        date: '2026-05-10',
        godownName: 'Nowhere',
        reason: 'damage',
        lines: [{ itemId: context.item.id, quantity: '1' }],
      }),
    ).rejects.toThrow(/Godown not found/)
  })
})

describe('postGodownTransfer', () => {
  test('moves quantity between godowns and keeps total quantity and value', async () => {
    const context = await journalContext()

    const result = await postGodownTransfer(context.deps, {
      companyId,
      date: '2026-05-10',
      fromGodown: 'Main',
      toGodown: 'Shop',
      lines: [{ itemId: context.item.id, quantity: '4' }],
    })

    expect(result.movements.map((movement) => movement.movementType)).toEqual([
      'transfer_out',
      'transfer_in',
    ])
    expect(result.movements.map((movement) => movement.value)).toEqual([
      '400.00',
      '400.00',
    ])
    expect(await context.stock.getBalance(companyId, context.item.id)).toBe(
      '10',
    )
    expect(await context.stock.getValue(companyId, context.item.id)).toBe(
      '1000.00',
    )
    const movements = await context.stock.listByCompanyId(companyId)
    expect(godownQuantity(movements, context.item.id, 'Main', 'Main')).toBe('6')
    expect(godownQuantity(movements, context.item.id, 'Shop', 'Main')).toBe('4')
    expect(await context.posting.listByCompanyId(companyId)).toHaveLength(0)
  })

  test('rejects a transfer to the same godown', async () => {
    const context = await journalContext()

    await expect(
      postGodownTransfer(context.deps, {
        companyId,
        date: '2026-05-10',
        fromGodown: 'Main',
        toGodown: 'Main',
        lines: [{ itemId: context.item.id, quantity: '1' }],
      }),
    ).rejects.toBeInstanceOf(InvalidStockJournalError)
  })

  test('rejects a transfer when the source godown is short', async () => {
    const context = await journalContext()

    await expect(
      postGodownTransfer(context.deps, {
        companyId,
        date: '2026-05-10',
        fromGodown: 'Shop',
        toGodown: 'Main',
        lines: [{ itemId: context.item.id, quantity: '1' }],
      }),
    ).rejects.toThrow(
      'Insufficient stock for Cotton Fabric in Shop: requested 1, available 0',
    )
  })
})
