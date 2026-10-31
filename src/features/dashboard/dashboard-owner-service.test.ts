import { describe, expect, test } from 'vitest'

import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import {
  getOwnerDashboardSnapshot,
  rollUpOverdueParties,
} from '#/features/dashboard/dashboard-owner-service.ts'
import {
  recordPurchaseSummary,
  recordSalesSummary,
} from '#/features/dashboard/dashboard-summary-service.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { AgeingRow } from '#/features/accounting/ageing-service.ts'
import type { Capability } from '#/features/companies/membership-service.ts'
import type { ExpenseRecord, ExpenseRepository } from '#/features/expenses/expense-service.ts'
import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'

class InMemoryExpenseRepository implements ExpenseRepository {
  constructor(private readonly rows: Array<ExpenseRecord> = []) {}

  async create(expense: ExpenseRecord) {
    this.rows.push(expense)
    return expense
  }

  async listByCompanyId(companyId: string) {
    return this.rows.filter((expense) => expense.companyId === companyId)
  }
}

function baseInvoice(
  overrides: Partial<SalesInvoiceRecord> = {},
): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: 'company-1',
    customerId: 'party-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-07-14',
    dueDate: '2026-07-14',
    placeOfSupply: '24',
    reverseCharge: false,
    paymentMode: 'credit',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    poReference: '',
    transportMode: '',
    vehicleNo: '',
    lrNumber: '',
    challanRef: '',
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '180.00',
    totalAmount: '1180.00',
    outstandingAmount: '1180.00',
    ledgerEntryId: 'entry-1',
    lines: [],
    createdAt: new Date(),
    partyNameSnapshot: 'Acme Traders',
    partyGstinSnapshot: null,
    partyPanSnapshot: '',
    partyBillingAddressSnapshot: '',
    partyShippingAddressSnapshot: '',
    partyStateCodeSnapshot: '24',
    partyPhoneSnapshot: '',
    partyEmailSnapshot: '',
    ...overrides,
  }
}

function baseBill(
  overrides: Partial<PurchaseBillRecord> = {},
): PurchaseBillRecord {
  return {
    id: 'bill-1',
    companyId: 'company-1',
    financialYearStart: '2026-04-01',
    supplierId: 'party-2',
    supplierBillNumber: 'PB-1',
    billDate: '2026-07-14',
    dueDate: '2026-07-14',
    placeOfSupply: '24',
    reverseCharge: false,
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    poReference: '',
    transportMode: '',
    vehicleNo: '',
    lrNumber: '',
    challanRef: '',
    taxableAmount: '500.00',
    totalGstAmount: '90.00',
    totalAmount: '590.00',
    outstandingAmount: '590.00',
    ledgerEntryId: 'entry-2',
    lines: [],
    createdAt: new Date(),
    partyNameSnapshot: 'Metro Supplies',
    partyGstinSnapshot: null,
    partyPanSnapshot: '',
    partyBillingAddressSnapshot: '',
    partyShippingAddressSnapshot: '',
    partyStateCodeSnapshot: '24',
    partyPhoneSnapshot: '',
    partyEmailSnapshot: '',
    ...overrides,
  }
}

function baseItem(overrides: Partial<ItemRecord> = {}): ItemRecord {
  return {
    id: 'item-1',
    companyId: 'company-1',
    name: 'Copper Wire 2.5mm',
    alias: '',
    itemGroup: '',
    hsnCode: '8544',
    gstRate: '18',
    baseUnit: 'MTR',
    alternateUnit: '',
    conversionFactor: '1',
    mrp: '0.00',
    reorderLevel: '25',
    purchaseRate: '40.00',
    saleRate: '60.00',
    tracksInventory: true,
    createdAt: new Date(),
    ...overrides,
  }
}

function ageingRow(overrides: Partial<AgeingRow> = {}): AgeingRow {
  return {
    partyId: 'party-1',
    partyName: 'Acme Traders',
    documentNumber: 'INV-1',
    documentDate: '2026-06-01',
    dueDate: '2026-06-14',
    outstandingAmount: '1000.00',
    daysOutstanding: 43,
    daysPastDue: 30,
    bucket: '1-30',
    ...overrides,
  }
}

describe('rollUpOverdueParties', () => {
  test('collapses a party\u2019s overdue documents into one signal', () => {
    const signals = rollUpOverdueParties([
      ageingRow({ documentNumber: 'INV-1', outstandingAmount: '1000.10', daysPastDue: 12 }),
      ageingRow({ documentNumber: 'INV-2', outstandingAmount: '2000.25', daysPastDue: 45 }),
      ageingRow({ documentNumber: 'INV-3', outstandingAmount: '0.05', daysPastDue: 3 }),
    ])

    expect(signals).toHaveLength(1)
    expect(signals[0]).toEqual({
      partyId: 'party-1',
      partyName: 'Acme Traders',
      documentCount: 3,
      outstandingAmount: '3000.40',
      maxDaysPastDue: 45,
    })
  })

  test('excludes documents that are not yet past due', () => {
    const signals = rollUpOverdueParties([
      ageingRow({
        documentNumber: 'INV-1',
        outstandingAmount: '1000.00',
        daysPastDue: 0,
        bucket: 'not-due',
      }),
      ageingRow({ documentNumber: 'INV-2', outstandingAmount: '250.00', daysPastDue: 5 }),
    ])

    expect(signals).toEqual([
      {
        partyId: 'party-1',
        partyName: 'Acme Traders',
        documentCount: 1,
        outstandingAmount: '250.00',
        maxDaysPastDue: 5,
      },
    ])
  })

  test('produces no signal for a party whose documents are all not yet due', () => {
    const signals = rollUpOverdueParties([
      ageingRow({
        partyId: 'party-9',
        partyName: 'Future Co',
        daysPastDue: 0,
        bucket: 'not-due',
      }),
      ageingRow({
        partyId: 'party-9',
        partyName: 'Future Co',
        documentNumber: 'INV-2',
        daysPastDue: 0,
        bucket: 'not-due',
      }),
    ])

    expect(signals).toEqual([])
  })

  test('keeps parties separate', () => {
    const signals = rollUpOverdueParties([
      ageingRow({ partyId: 'party-1', outstandingAmount: '100.00', daysPastDue: 4 }),
      ageingRow({
        partyId: 'party-2',
        partyName: 'Metro Supplies',
        outstandingAmount: '200.00',
        daysPastDue: 9,
      }),
    ])

    expect(signals.map((signal) => signal.partyId)).toEqual([
      'party-1',
      'party-2',
    ])
  })
})

describe('getOwnerDashboardSnapshot', () => {
  test('builds today pulse, due today, trend, and cash balance', async () => {
    const companyId = 'company-1'
    const asOfDate = '2026-07-14'
    const summaries = new InMemoryDashboardSummaryRepository()
    const invoices = new InMemorySalesInvoiceRepository()
    const bills = new InMemoryPurchaseBillRepository()
    const parties = new InMemoryPartyRepository()
    const expenses = new InMemoryExpenseRepository([
      {
        id: 'exp-1',
        companyId,
        expenseDate: asOfDate,
        narration: 'Fuel',
        amount: '500.00',
        expenseAccountId: 'expense-ledger',
        paymentAccountId: 'cash',
        ledgerEntryId: 'entry-exp',
        createdAt: new Date(),
      },
    ])
    const postings = new InMemoryLedgerPostingRepository()
    const ledgers = new InMemoryLedgerAccountRepository()
    const createdAt = new Date()

    await parties.create({
      id: 'party-1',
      companyId,
      name: 'Acme Traders',
      partyType: 'customer',
      gstin: null,
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 30,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
      createdAt,
    })
    await parties.create({
      id: 'party-2',
      companyId,
      name: 'Metro Supplies',
      partyType: 'supplier',
      gstin: null,
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 30,
      receivableAccountId: null,
      payableAccountId: 'pay-1',
      createdAt,
    })

    await ledgers.createMany([
      {
        id: 'cash',
        companyId,
        code: '1000',
        name: 'Cash',
        accountType: 'asset',
        systemKey: 'cash',
        isSystem: true,
        createdAt,
      },
      {
        id: 'sales',
        companyId,
        code: '4000',
        name: 'Sales',
        accountType: 'income',
        systemKey: 'sales',
        isSystem: true,
        createdAt,
      },
    ])

    await postLedgerEntry(postings, {
      companyId,
      entryDate: asOfDate,
      narration: 'Cash receipt',
      voucherType: 'receipt',
      lines: [
        { ledgerAccountId: 'cash', debit: '2000.00', credit: '0.00' },
        { ledgerAccountId: 'sales', debit: '0.00', credit: '2000.00' },
      ],
    })

    await recordSalesSummary(summaries, {
      companyId,
      summaryDate: asOfDate,
      salesAmount: '5000.00',
      receivableAmount: '5000.00',
      stockOutQuantity: '10',
    })
    await recordPurchaseSummary(summaries, {
      companyId,
      summaryDate: '2026-07-13',
      purchaseAmount: '1200.00',
      payableAmount: '1200.00',
      stockInQuantity: '5',
    })

    await invoices.create(baseInvoice())
    await bills.create(baseBill())

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries,
        invoices,
        bills,
        parties,
        expenses,
        postings,
        ledgers,
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      { includeReports: true, capabilities: ['view', 'view_reports'] },
    )

    expect(snapshot.today.salesTotal).toBe('5000.00')
    expect(snapshot.today.purchaseTotal).toBe('0.00')
    expect(snapshot.today.moneyIn).toBe('2000.00')
    expect(snapshot.today.expensesTotal).toBe('500.00')
    expect(snapshot.today.netCashFlow).toBe('2000.00')
    expect(snapshot.balances.cashBankBalance).toBe('2000.00')
    expect(snapshot.balances.receivableTotal).toBe('1180.00')
    expect(snapshot.balances.payableTotal).toBe('590.00')
    expect(snapshot.dueToday.receivables).toHaveLength(1)
    expect(snapshot.dueToday.payables).toHaveLength(1)
    expect(snapshot.todayExpenses).toHaveLength(1)
    expect(snapshot.trend).toHaveLength(7)
    expect(snapshot.trend.at(-1)?.sales).toBe('5000.00')
    expect(snapshot.trend.at(-2)?.purchases).toBe('1200.00')
    expect(snapshot.monthCompare.current.salesTotal).toBe('5000.00')
    expect(snapshot.monthCompare.previous.salesTotal).toBe('0.00')
    expect(snapshot.gstMtd?.outputGst).toBe('180.00')
    expect(snapshot.gstMtd?.inputGst).toBe('90.00')
  })

  test('counts a document as overdue from the first day past its due date', async () => {
    const companyId = 'company-1'
    const asOfDate = '2026-07-14'
    const invoices = new InMemorySalesInvoiceRepository()
    const bills = new InMemoryPurchaseBillRepository()

    await invoices.create(
      baseInvoice({ id: 'inv-not-due', dueDate: '2026-07-20' }),
    )
    await invoices.create(
      baseInvoice({
        id: 'inv-one-day-late',
        invoiceNumber: 'INV-2',
        dueDate: '2026-07-13',
      }),
    )
    await bills.create(baseBill({ id: 'bill-not-due', dueDate: '2026-07-20' }))
    await bills.create(
      baseBill({
        id: 'bill-one-day-late',
        supplierBillNumber: 'PB-2',
        dueDate: '2026-07-13',
      }),
    )

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices,
        bills,
        parties: new InMemoryPartyRepository(),
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      { includeReports: true, capabilities: ['view', 'view_reports'] },
    )

    expect(snapshot.ageing?.receivables['not-due']).toBe('1180.00')
    expect(snapshot.ageing?.receivables['1-30']).toBe('1180.00')
    expect(snapshot.ageing?.payables['not-due']).toBe('590.00')
    expect(snapshot.ageing?.payables['1-30']).toBe('590.00')
    expect(snapshot.overdue.invoiceCount).toBe(1)
    expect(snapshot.overdue.billCount).toBe(1)
  })

  test('ranks overdue money and GST into the attention queue', async () => {
    const companyId = 'company-1'
    const asOfDate = '2026-07-14'
    const invoices = new InMemorySalesInvoiceRepository()
    const parties = new InMemoryPartyRepository()

    await parties.create({
      id: 'party-1',
      companyId,
      name: 'Acme Traders',
      partyType: 'customer',
      gstin: null,
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 30,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
      createdAt: new Date(),
    })

    await invoices.create(
      baseInvoice({
        id: 'inv-late-1',
        invoiceNumber: 'INV-1',
        invoiceDate: '2026-07-01',
        dueDate: '2026-07-01',
        outstandingAmount: '200000.00',
      }),
    )
    await invoices.create(
      baseInvoice({
        id: 'inv-late-2',
        invoiceNumber: 'INV-2',
        invoiceDate: '2026-07-05',
        dueDate: '2026-07-05',
        outstandingAmount: '100000.00',
      }),
    )
    await invoices.create(
      baseInvoice({
        id: 'inv-not-due',
        invoiceNumber: 'INV-3',
        invoiceDate: '2026-07-10',
        dueDate: '2026-07-20',
        outstandingAmount: '50000.00',
      }),
    )

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices,
        bills: new InMemoryPurchaseBillRepository(),
        parties,
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      {
        includeReports: true,
        capabilities: ['view', 'view_reports', 'post_payment', 'manage_gst'],
      },
    )

    const receivable = snapshot.attention[0]
    expect(receivable.kind).toBe('overdue-receivable')
    expect(receivable.id).toBe('overdue-receivable:party-1')
    expect(receivable.title).toBe('Collect from Acme Traders')
    expect(receivable.detail).toContain('2 invoices overdue')
    expect(receivable.amount).toBe('300000.00')
    expect(receivable.actionable).toBe(true)

    const gst = snapshot.attention.find((item) => item.kind === 'gst-due')
    expect(gst?.amount).toBe(snapshot.gstMtd?.netGstPayable)
    expect(gst?.title).toContain(snapshot.monthCompare.currentLabel)
    expect(gst?.detail).toBe('Filing due date not set')

    const scores = snapshot.attention.map((item) => item.score)
    expect(scores).toEqual([...scores].sort((left, right) => right - left))
  })

  test('withholds money and GST rows from a caller without view_reports', async () => {
    const companyId = 'company-1'
    const invoices = new InMemorySalesInvoiceRepository()

    await invoices.create(
      baseInvoice({
        id: 'inv-late',
        invoiceDate: '2026-07-01',
        dueDate: '2026-07-01',
        outstandingAmount: '200000.00',
      }),
    )

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices,
        bills: new InMemoryPurchaseBillRepository(),
        parties: new InMemoryPartyRepository(),
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      '2026-07-14',
      '24',
      { includeReports: false, capabilities: ['view', 'post_payment'] },
    )

    expect(snapshot.ageing).toBeUndefined()
    expect(snapshot.gstMtd).toBeUndefined()
    expect(snapshot.attention).toEqual([])
  })

  test('withholds all financial figures when includeReports is false', async () => {
    const companyId = 'company-1'
    const asOfDate = '2026-07-14'
    const summaries = new InMemoryDashboardSummaryRepository()
    const invoices = new InMemorySalesInvoiceRepository()
    const bills = new InMemoryPurchaseBillRepository()
    const expenses = new InMemoryExpenseRepository([
      {
        id: 'exp-1',
        companyId,
        expenseDate: asOfDate,
        narration: 'Fuel',
        amount: '500.00',
        expenseAccountId: 'expense-ledger',
        paymentAccountId: 'cash',
        ledgerEntryId: 'entry-exp',
        createdAt: new Date(),
      },
    ])

    await recordSalesSummary(summaries, {
      companyId,
      summaryDate: asOfDate,
      salesAmount: '5000.00',
      receivableAmount: '5000.00',
      stockOutQuantity: '10',
    })
    await invoices.create(
      baseInvoice({
        dueDate: asOfDate,
        outstandingAmount: '1180.00',
      }),
    )
    await bills.create(baseBill({ dueDate: asOfDate }))

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries,
        invoices,
        bills,
        parties: new InMemoryPartyRepository(),
        expenses,
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      { includeReports: false, capabilities: ['view', 'manage_inventory'] },
    )

    expect(snapshot.ageing).toBeUndefined()
    expect(snapshot.gstMtd).toBeUndefined()
    expect(snapshot.today).toEqual({
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      moneyIn: '0.00',
      moneyOut: '0.00',
      expensesTotal: '0.00',
      netCashFlow: '0.00',
    })
    expect(snapshot.balances).toEqual({
      cashBankBalance: '0.00',
      receivableTotal: '0.00',
      receivableOverdue: '0.00',
      payableTotal: '0.00',
      payableDueThisWeek: '0.00',
    })
    expect(snapshot.topReceivables).toEqual([])
    expect(snapshot.topPayables).toEqual([])
    expect(snapshot.dueToday).toEqual({ receivables: [], payables: [] })
    expect(snapshot.todayExpenses).toEqual([])
    expect(snapshot.overdue).toEqual({ invoiceCount: 0, billCount: 0 })
    expect(snapshot.trend.every((day) => day.sales === '0.00')).toBe(true)
    expect(snapshot.trend.every((day) => day.purchases === '0.00')).toBe(true)
    expect(snapshot.monthCompare.current).toEqual({
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      expensesTotal: '0.00',
    })
    expect(snapshot.monthCompare.previous).toEqual({
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      expensesTotal: '0.00',
    })
  })

  test('defaults includeReports to false so a forgotten option cannot leak report data', async () => {
    const companyId = 'company-1'
    const invoices = new InMemorySalesInvoiceRepository()
    await invoices.create(
      baseInvoice({
        id: 'inv-late',
        invoiceDate: '2026-07-01',
        dueDate: '2026-07-01',
        outstandingAmount: '200000.00',
      }),
    )

    const snapshot = await getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices,
        bills: new InMemoryPurchaseBillRepository(),
        parties: new InMemoryPartyRepository(),
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      '2026-07-14',
      '24',
    )

    expect(snapshot.ageing).toBeUndefined()
    expect(snapshot.gstMtd).toBeUndefined()
    expect(snapshot.balances.receivableTotal).toBe('0.00')
    expect(snapshot.overdue.invoiceCount).toBe(0)
  })
})

describe('getOwnerDashboardSnapshot low stock', () => {
  const companyId = 'company-1'
  const asOfDate = '2026-07-14'

  type StockedItem = {
    item: ItemRecord
    /** Received through a stock movement, the only way stock may change. */
    receivedQuantity?: string
  }

  async function snapshotWithStock(
    stocked: Array<StockedItem>,
    overrides: {
      invoices?: InMemorySalesInvoiceRepository
      includeReports?: boolean
      capabilities?: Array<Capability>
    } = {},
  ) {
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()

    for (const entry of stocked) {
      await items.create(entry.item)
      if (entry.receivedQuantity) {
        await recordStockMovement(stock, stock, {
          companyId: entry.item.companyId,
          itemId: entry.item.id,
          movementType: 'opening',
          quantity: entry.receivedQuantity,
          unit: entry.item.baseUnit,
          referenceType: 'opening_stock',
          referenceId: entry.item.id,
          occurredOn: '2026-07-01',
        })
      }
    }

    return getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices: overrides.invoices ?? new InMemorySalesInvoiceRepository(),
        bills: new InMemoryPurchaseBillRepository(),
        parties: new InMemoryPartyRepository(),
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items,
        stockBalances: stock,
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      {
        includeReports: overrides.includeReports ?? true,
        capabilities: overrides.capabilities ?? [
          'view',
          'view_reports',
          'manage_inventory',
          'post_payment',
          'manage_gst',
        ],
      },
    )
  }

  test('raises a signal for an item below its reorder level', async () => {
    const snapshot = await snapshotWithStock([
      { item: baseItem({ reorderLevel: '25' }), receivedQuantity: '8' },
    ])

    const lowStock = snapshot.attention.filter(
      (item) => item.kind === 'low-stock',
    )
    expect(lowStock).toHaveLength(1)
    expect(lowStock[0].id).toBe('low-stock:item-1')
    expect(lowStock[0].title).toBe('Copper Wire 2.5mm is below reorder level')
    expect(lowStock[0].detail).toBe('8 in stock · reorder at 25')
    expect(lowStock[0].to).toBe('/app/inventory')
    expect(lowStock[0].search).toEqual({ item: 'item-1' })
    expect(lowStock[0].actionable).toBe(true)
  })

  test('raises a signal for an item that is out of stock', async () => {
    const snapshot = await snapshotWithStock([
      { item: baseItem({ reorderLevel: '25' }) },
    ])

    const lowStock = snapshot.attention.filter(
      (item) => item.kind === 'low-stock',
    )
    expect(lowStock).toHaveLength(1)
    expect(lowStock[0].title).toBe('Copper Wire 2.5mm is out of stock')
    expect(lowStock[0].detail).toBe('0 in stock · reorder at 25')
  })

  test('raises no signal for an item with no reorder level set', async () => {
    const snapshot = await snapshotWithStock([
      { item: baseItem({ id: 'item-zero', reorderLevel: '0' }) },
      { item: baseItem({ id: 'item-unset', reorderLevel: '' }) },
    ])

    expect(snapshot.attention).toEqual([])
  })

  test('raises no signal for an item comfortably above its reorder level', async () => {
    const snapshot = await snapshotWithStock([
      { item: baseItem({ reorderLevel: '25' }), receivedQuantity: '100' },
    ])

    expect(snapshot.attention).toEqual([])
  })

  test('reaches a caller without view_reports, unlike money and GST rows', async () => {
    const invoices = new InMemorySalesInvoiceRepository()
    await invoices.create(
      baseInvoice({
        id: 'inv-late',
        invoiceDate: '2026-07-01',
        dueDate: '2026-07-01',
        outstandingAmount: '200000.00',
      }),
    )

    const snapshot = await snapshotWithStock(
      [{ item: baseItem({ reorderLevel: '25' }), receivedQuantity: '8' }],
      {
        invoices,
        includeReports: false,
        capabilities: ['view', 'manage_inventory'],
      },
    )

    expect(snapshot.ageing).toBeUndefined()
    expect(snapshot.gstMtd).toBeUndefined()
    expect(snapshot.attention.map((item) => item.kind)).toEqual(['low-stock'])
    expect(snapshot.attention[0].actionable).toBe(true)
  })
})

describe('getOwnerDashboardSnapshot money position and setup', () => {
  const companyId = 'company-1'
  const asOfDate = '2026-07-14'

  async function party(
    parties: InMemoryPartyRepository,
    id: string,
    name: string,
    partyType: 'customer' | 'supplier',
    contactPhone = '',
  ) {
    await parties.create({
      id,
      companyId,
      name,
      partyType,
      gstin: null,
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 0,
      receivableAccountId: partyType === 'customer' ? 'recv-1' : null,
      payableAccountId: partyType === 'supplier' ? 'pay-1' : null,
      contactPhone,
      createdAt: new Date(),
    })
  }

  async function snapshot(
    deps: {
      invoices?: InMemorySalesInvoiceRepository
      bills?: InMemoryPurchaseBillRepository
      parties?: InMemoryPartyRepository
      items?: InMemoryItemRepository
    },
    includeReports = true,
  ) {
    return getOwnerDashboardSnapshot(
      {
        summaries: new InMemoryDashboardSummaryRepository(),
        invoices: deps.invoices ?? new InMemorySalesInvoiceRepository(),
        bills: deps.bills ?? new InMemoryPurchaseBillRepository(),
        parties: deps.parties ?? new InMemoryPartyRepository(),
        expenses: new InMemoryExpenseRepository(),
        postings: new InMemoryLedgerPostingRepository(),
        ledgers: new InMemoryLedgerAccountRepository(),
        items: deps.items ?? new InMemoryItemRepository(),
        stockBalances: new InMemoryStockStore(),
        notes: new InMemoryCreditDebitNoteRepository(),
      },
      companyId,
      asOfDate,
      '24',
      {
        includeReports,
        capabilities: includeReports
          ? ['view', 'view_reports', 'post_payment']
          : ['view'],
      },
    )
  }

  test('splits receivables into overdue and payables into due within 7 days', async () => {
    const invoices = new InMemorySalesInvoiceRepository()
    const bills = new InMemoryPurchaseBillRepository()
    await invoices.create(
      baseInvoice({ id: 'late', dueDate: '2026-07-10', outstandingAmount: '300.00' }),
    )
    await invoices.create(
      baseInvoice({ id: 'later', invoiceNumber: 'INV-2', dueDate: '2026-07-30', outstandingAmount: '700.00' }),
    )
    await bills.create(
      baseBill({ id: 'overdue-bill', dueDate: '2026-07-01', outstandingAmount: '100.00' }),
    )
    await bills.create(
      baseBill({ id: 'this-week', supplierBillNumber: 'PB-2', dueDate: '2026-07-20', outstandingAmount: '200.00' }),
    )
    await bills.create(
      baseBill({ id: 'next-week', supplierBillNumber: 'PB-3', dueDate: '2026-07-21', outstandingAmount: '400.00' }),
    )

    const result = await snapshot({ invoices, bills })

    expect(result.balances.receivableTotal).toBe('1000.00')
    expect(result.balances.receivableOverdue).toBe('300.00')
    expect(result.balances.payableTotal).toBe('700.00')
    expect(result.balances.payableDueThisWeek).toBe('300.00')
  })

  test('lists the top parties by outstanding, with their overdue part', async () => {
    const invoices = new InMemorySalesInvoiceRepository()
    const parties = new InMemoryPartyRepository()
    await party(parties, 'small', 'Small Customer', 'customer')
    await party(parties, 'big', 'Big Customer', 'customer')
    await invoices.create(
      baseInvoice({ id: 'a', customerId: 'small', outstandingAmount: '100.00', dueDate: '2026-07-30' }),
    )
    await invoices.create(
      baseInvoice({ id: 'b', invoiceNumber: 'INV-2', customerId: 'big', outstandingAmount: '500.00', dueDate: '2026-07-01' }),
    )
    await invoices.create(
      baseInvoice({ id: 'c', invoiceNumber: 'INV-3', customerId: 'big', outstandingAmount: '250.00', dueDate: '2026-07-30' }),
    )

    const result = await snapshot({ invoices, parties })

    expect(result.topReceivables).toEqual([
      { partyId: 'big', partyName: 'Big Customer', outstandingAmount: '750.00', overdueAmount: '500.00' },
      { partyId: 'small', partyName: 'Small Customer', outstandingAmount: '100.00', overdueAmount: '0.00' },
    ])
    expect(result.topPayables).toEqual([])
  })

  test('carries the party phone on overdue rows for reminders', async () => {
    const invoices = new InMemorySalesInvoiceRepository()
    const parties = new InMemoryPartyRepository()
    await party(parties, 'party-1', 'Acme Traders', 'customer', '98765 43210')
    await invoices.create(baseInvoice({ dueDate: '2026-07-01' }))

    const result = await snapshot({ invoices, parties })

    const row = result.attention.find((item) => item.kind === 'overdue-receivable')
    expect(row?.contactPhone).toBe('98765 43210')
  })

  test('reports setup progress from real records only', async () => {
    const empty = await snapshot({}, false)
    expect(empty.setup).toEqual({ hasParty: false, hasItem: false, hasSale: false })

    const parties = new InMemoryPartyRepository()
    const items = new InMemoryItemRepository()
    const invoices = new InMemorySalesInvoiceRepository()
    await party(parties, 'party-1', 'Acme Traders', 'customer')
    await items.create(baseItem())
    await invoices.create(baseInvoice({ status: 'cancelled' }))

    const partial = await snapshot({ parties, items, invoices }, false)
    expect(partial.setup).toEqual({ hasParty: true, hasItem: true, hasSale: false })

    await invoices.create(baseInvoice({ id: 'inv-2', invoiceNumber: 'INV-2' }))
    const done = await snapshot({ parties, items, invoices })
    expect(done.setup).toEqual({ hasParty: true, hasItem: true, hasSale: true })
  })
})
