import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import {
  InsufficientStockError,
  getCurrentStock,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import {
  CreditLimitExceededError,
  InvoiceAlreadyCancelledError,
  cancelSalesInvoice,
  postSalesInvoice,
} from '#/features/sales/sales-invoice-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

class InMemorySalesInvoiceRepository implements SalesInvoiceRepository {
  private invoices: Array<SalesInvoiceRecord> = []

  async create(invoice: SalesInvoiceRecord) {
    this.invoices.push(invoice)
    return invoice
  }

  async findById(id: string) {
    return this.invoices.find((invoice) => invoice.id === id) ?? null
  }

  async save(invoice: SalesInvoiceRecord) {
    const index = this.invoices.findIndex((item) => item.id === invoice.id)
    if (index >= 0) {
      this.invoices[index] = invoice
    }
    return invoice
  }

  async listByCompanyId(companyId: string) {
    return this.invoices.filter((invoice) => invoice.companyId === companyId)
  }

  list() {
    return this.invoices
  }
}

async function seedSalesContext() {
  const ledgerAccounts = new InMemoryLedgerAccountRepository()
  const ledgerPosting = new InMemoryLedgerPostingRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()
  const stock = new InMemoryStockStore()
  const invoices = new InMemorySalesInvoiceRepository()

  const companyId = 'company-1'
  const accounts = await setupDefaultChartOfAccounts(ledgerAccounts, {
    companyId,
    businessType: 'wholesale',
  })

  const salesAccountId = accounts.find(
    (account) => account.systemKey === 'sales',
  )!.id
  const outputGstAccountId = accounts.find(
    (account) => account.systemKey === 'output_gst',
  )!.id
  const receivableAccountId = accounts.find(
    (account) => account.systemKey === 'customer_receivable',
  )!.id
  const cashAccountId = accounts.find(
    (account) => account.systemKey === 'cash',
  )!.id

  const customer = await createParty(parties, {
    companyId,
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    billingAddress: '12 Market Road, Surat',
    stateCode: '27',
    creditLimit: '100000.00',
    paymentTermsDays: 30,
    receivableAccountId,
    payableAccountId: null,
  })

  const item = await createItem(items, {
    companyId,
    name: 'Cotton Fabric',
    hsnCode: '5208',
    gstRate: '5.00',
    baseUnit: 'meter',
    purchaseRate: '80.00',
    saleRate: '120.00',
    tracksInventory: true,
  })

  await recordStockMovement(stock, stock, {
    companyId,
    itemId: item.id,
    movementType: 'opening',
    quantity: '100',
    unit: 'meter',
    referenceType: 'opening_stock',
    referenceId: 'opening-1',
    occurredOn: '2026-04-01',
  })

  return {
    companyId,
    salesAccountId,
    outputGstAccountId,
    receivableAccountId,
    cashAccountId,
    customer,
    item,
    items,
    ledgerPosting,
    stock,
    invoices,
    parties,
  }
}

describe('postSalesInvoice', () => {
  test('loads each item once per invoice, even when it is costed and moved', async () => {
    const context = await seedSalesContext()
    const lookups: Array<string> = []
    const findById = context.items.findById.bind(context.items)
    context.items.findById = (id: string) => {
      lookups.push(id)
      return findById(id)
    }
    const line = {
      itemId: context.item.id,
      description: 'Cotton Fabric',
      quantity: '2',
      unit: 'meter',
      rate: '120.00',
      gstRate: '5.00',
    }

    await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-3001',
        invoiceDate: '2026-07-11',
        paymentMode: 'cash',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        cogsAccountId: context.salesAccountId,
        stockAccountId: context.cashAccountId,
        lines: [line, { ...line, quantity: '3' }],
      },
    )

    expect(lookups).toEqual([context.item.id])
  })

  test('rejects selling an item with no stock instead of inventing opening stock', async () => {
    const context = await seedSalesContext()
    const unstocked = await createItem(context.items, {
      companyId: context.companyId,
      name: 'Silk Blend',
      hsnCode: '5007',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '200.00',
      saleRate: '260.00',
      tracksInventory: true,
    })

    await expect(
      postSalesInvoice(
        {
          invoices: context.invoices,
          posting: context.ledgerPosting,
          stock: context.stock,
          items: context.items,
          parties: context.parties,
        },
        {
          companyId: context.companyId,
          companyStateCode: '27',
          customerId: context.customer.id,
          customerStateCode: '27',
          invoiceNumber: 'INV-2001',
          invoiceDate: '2026-07-11',
          paymentMode: 'cash',
          salesAccountId: context.salesAccountId,
          outputGstAccountId: context.outputGstAccountId,
          receivableAccountId: context.receivableAccountId,
          cashAccountId: context.cashAccountId,
          lines: [
            {
              itemId: unstocked.id,
              description: 'Silk Blend',
              quantity: '5',
              unit: 'meter',
              rate: '260.00',
              gstRate: '5.00',
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(InsufficientStockError)

    const movements = await context.stock.listByCompanyId(context.companyId)
    expect(
      movements.filter((movement) => movement.itemId === unstocked.id),
    ).toEqual([])
  })

  test('posts credit sales invoice for 20 meters at Rs. 120 with 5% GST', async () => {
    const context = await seedSalesContext()

    const invoice = await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-1001',
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '20',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(
      await getCurrentStock(context.stock, context.companyId, context.item.id),
    ).toBe('80')
    expect(invoice.taxableAmount).toBe('2400.00')
    expect(invoice.totalGstAmount).toBe('120.00')
    expect(invoice.totalAmount).toBe('2520.00')
    expect(invoice.paymentStatus).toBe('Pending')

    const entry = context.ledgerPosting.list()[0]
    const salesLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.salesAccountId,
    )
    const gstLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.outputGstAccountId,
    )
    const receivableLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.receivableAccountId,
    )
    const cashLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.cashAccountId,
    )

    expect(salesLine?.credit).toBe('2400.00')
    expect(gstLine?.credit).toBe('120.00')
    expect(receivableLine?.debit).toBe('2520.00')
    expect(cashLine).toBeUndefined()
  })

  test('charges no GST when the company is unregistered', async () => {
    const context = await seedSalesContext()

    const invoice = await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        companyGstin: null,
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-1001',
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        taxMode: 'inclusive',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '20',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(invoice.taxableAmount).toBe('2400.00')
    expect(invoice.totalGstAmount).toBe('0.00')
    expect(invoice.totalAmount).toBe('2400.00')
    expect(invoice.lines[0].gstRate).toBe('0.00')
    expect(invoice.lines[0].gstAmount).toBe('0.00')

    const entry = context.ledgerPosting.list()[0]
    const salesLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.salesAccountId,
    )
    const gstLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.outputGstAccountId,
    )

    expect(salesLine?.credit).toBe('2400.00')
    expect(gstLine?.credit ?? '0.00').toBe('0.00')
  })

  test('posts cash sale without creating receivable', async () => {
    const context = await seedSalesContext()

    const invoice = await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-1002',
        invoiceDate: '2026-07-11',
        paymentMode: 'cash',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '10',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(invoice.paymentStatus).toBe('Paid')
    expect(invoice.totalAmount).toBe('1260.00')

    const entry = context.ledgerPosting.list()[0]
    const cashLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.cashAccountId,
    )
    const receivableLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.receivableAccountId,
    )

    expect(cashLine?.debit).toBe('1260.00')
    expect(receivableLine).toBeUndefined()
  })

  test('rejects credit sale when customer credit limit is exceeded', async () => {
    const context = await seedSalesContext()

    await recordStockMovement(context.stock, context.stock, {
      companyId: context.companyId,
      itemId: context.item.id,
      movementType: 'adjustment',
      quantity: '900',
      unit: 'meter',
      referenceType: 'test_setup',
      referenceId: 'credit-limit-stock',
      occurredOn: '2026-07-10',
    })

    await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-9001',
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '790',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    await expect(
      postSalesInvoice(
        {
          invoices: context.invoices,
          posting: context.ledgerPosting,
          stock: context.stock,
          parties: context.parties,
        },
        {
          companyId: context.companyId,
          companyStateCode: '27',
          customerId: context.customer.id,
          customerStateCode: '27',
          invoiceNumber: 'INV-9002',
          invoiceDate: '2026-07-12',
          paymentMode: 'credit',
          salesAccountId: context.salesAccountId,
          outputGstAccountId: context.outputGstAccountId,
          receivableAccountId: context.receivableAccountId,
          cashAccountId: context.cashAccountId,
          lines: [
            {
              itemId: context.item.id,
              description: 'Cotton Fabric',
              quantity: '10',
              unit: 'meter',
              rate: '120.00',
              gstRate: '5.00',
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(CreditLimitExceededError)
  })
})

describe('cancelSalesInvoice', () => {
  test('marks a posted invoice as cancelled', async () => {
    const context = await seedSalesContext()

    const invoice = await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-1003',
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '5',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(invoice.status).toBe('posted')

    const cancelled = await cancelSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
      },
      { companyId: context.companyId, invoiceId: invoice.id },
    )

    expect(cancelled.status).toBe('cancelled')

    const stockAfterCancel = await getCurrentStock(
      context.stock,
      context.companyId,
      context.item.id,
    )
    expect(stockAfterCancel).toBe('100')

    const ledgerEntries = await context.ledgerPosting.listByCompanyId(
      context.companyId,
    )
    expect(ledgerEntries).toHaveLength(2)
  })

  test('rejects cancelling an already cancelled invoice', async () => {
    const context = await seedSalesContext()

    const invoice = await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-1004',
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '5',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    await cancelSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
      },
      { companyId: context.companyId, invoiceId: invoice.id },
    )

    await expect(
      cancelSalesInvoice(
        {
          invoices: context.invoices,
          posting: context.ledgerPosting,
          stock: context.stock,
        },
        { companyId: context.companyId, invoiceId: invoice.id },
      ),
    ).rejects.toBeInstanceOf(InvoiceAlreadyCancelledError)
  })
})

describe('sales cost of goods sold', () => {
  async function valuedContext() {
    const context = await seedSalesContext()
    const ledgerAccounts = new InMemoryLedgerAccountRepository()
    const chart = await setupDefaultChartOfAccounts(ledgerAccounts, {
      companyId: context.companyId,
      businessType: 'wholesale',
    })
    const cogsAccountId = chart.find((a) => a.systemKey === 'cogs')!.id
    const stockAccountId = chart.find(
      (a) => a.systemKey === 'stock_in_hand',
    )!.id

    // Bought at Rs. 60 and Rs. 90 while the item master still says Rs. 80.
    const item = await createItem(context.items, {
      companyId: context.companyId,
      name: 'Linen',
      hsnCode: '5309',
      gstRate: '5.00',
      baseUnit: 'meter',
      purchaseRate: '80.00',
      saleRate: '150.00',
      tracksInventory: true,
    })
    for (const [referenceId, value] of [
      ['bill-1', '600.00'],
      ['bill-2', '900.00'],
    ]) {
      await recordStockMovement(context.stock, context.stock, {
        companyId: context.companyId,
        itemId: item.id,
        movementType: 'purchase_in',
        quantity: '10',
        unit: 'meter',
        referenceType: 'purchase_bill',
        referenceId,
        occurredOn: '2026-07-01',
        value,
      })
    }

    const deps = {
      invoices: context.invoices,
      posting: context.ledgerPosting,
      stock: context.stock,
      items: context.items,
      parties: context.parties,
    }
    const input = {
      companyId: context.companyId,
      companyStateCode: '27',
      customerId: context.customer.id,
      customerStateCode: '27',
      invoiceNumber: 'INV-3001',
      invoiceDate: '2026-07-11',
      paymentMode: 'cash' as const,
      salesAccountId: context.salesAccountId,
      outputGstAccountId: context.outputGstAccountId,
      receivableAccountId: context.receivableAccountId,
      cashAccountId: context.cashAccountId,
      cogsAccountId,
      stockAccountId,
      lines: [
        {
          itemId: item.id,
          description: 'Linen',
          quantity: '5',
          unit: 'meter',
          rate: '150.00',
          gstRate: '5.00',
        },
      ],
    }

    return { context, deps, input, item, cogsAccountId, stockAccountId }
  }

  test('books COGS at the moving average cost, not the item purchase rate', async () => {
    const { context, deps, input, item, cogsAccountId, stockAccountId } =
      await valuedContext()

    await postSalesInvoice(deps, input)

    const entry = context.ledgerPosting.list()[0]
    const cogs = entry.lines.find((l) => l.ledgerAccountId === cogsAccountId)
    const stock = entry.lines.find((l) => l.ledgerAccountId === stockAccountId)
    expect(cogs?.debit).toBe('375.00')
    expect(stock?.credit).toBe('375.00')
    expect(await context.stock.getValue(context.companyId, item.id)).toBe(
      '1125.00',
    )
  })

  test('omits COGS lines when the stock sold has no recorded cost', async () => {
    const context = await seedSalesContext()
    const chart = await setupDefaultChartOfAccounts(
      new InMemoryLedgerAccountRepository(),
      { companyId: context.companyId, businessType: 'wholesale' },
    )
    const cogsAccountId = chart.find((a) => a.systemKey === 'cogs')!.id
    const stockAccountId = chart.find(
      (a) => a.systemKey === 'stock_in_hand',
    )!.id

    await postSalesInvoice(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        invoiceNumber: 'INV-3002',
        invoiceDate: '2026-07-11',
        paymentMode: 'cash',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.cashAccountId,
        cogsAccountId,
        stockAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '5',
            unit: 'meter',
            rate: '120.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    const entry = context.ledgerPosting.list()[0]
    expect(entry.lines.some((l) => l.ledgerAccountId === cogsAccountId)).toBe(
      false,
    )
  })

  test('cancelling returns stock at the cost the invoice removed', async () => {
    const { context, deps, input, item } = await valuedContext()
    const invoice = await postSalesInvoice(deps, input)
    // A later purchase moves the average; the cancel must not use it.
    await recordStockMovement(context.stock, context.stock, {
      companyId: context.companyId,
      itemId: item.id,
      movementType: 'purchase_in',
      quantity: '5',
      unit: 'meter',
      referenceType: 'purchase_bill',
      referenceId: 'bill-3',
      occurredOn: '2026-07-12',
      value: '1000.00',
    })

    await cancelSalesInvoice(deps, {
      companyId: context.companyId,
      invoiceId: invoice.id,
    })

    expect(await context.stock.getValue(context.companyId, item.id)).toBe(
      '2500.00',
    )
  })
})
