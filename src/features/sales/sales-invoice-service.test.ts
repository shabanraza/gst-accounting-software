import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import {
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
    stateCode: '27',
    addressLine1: 'Plot 8, Industrial Area',
    city: 'Pune',
    pincode: '411001',
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
