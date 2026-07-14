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
import { postPurchaseBill } from '#/features/purchases/purchase-bill-service.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { postSalesInvoice } from '#/features/sales/sales-invoice-service.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { postPurchaseReturn } from '#/features/returns/purchase-return-service.ts'
import { postSalesReturn } from '#/features/returns/sales-return-service.ts'

async function seedReturnsContext() {
  const ledgerAccounts = new InMemoryLedgerAccountRepository()
  const ledgerPosting = new InMemoryLedgerPostingRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()
  const stock = new InMemoryStockStore()
  const invoices = new InMemorySalesInvoiceRepository()
  const bills = new InMemoryPurchaseBillRepository()
  const notes = new InMemoryCreditDebitNoteRepository()

  const companyId = 'company-1'
  const accounts = await setupDefaultChartOfAccounts(ledgerAccounts, {
    companyId,
    businessType: 'wholesale',
  })
  const byKey = (key: string) =>
    accounts.find((account) => account.systemKey === key)!.id

  const customer = await createParty(parties, {
    companyId,
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: byKey('customer_receivable'),
    payableAccountId: null,
  })

  const supplier = await createParty(parties, {
    companyId,
    name: 'Textile Mills Ltd',
    partyType: 'supplier',
    gstin: '24AABCU9603R1ZM',
    stateCode: '24',
    creditLimit: null,
    paymentTermsDays: 15,
    receivableAccountId: null,
    payableAccountId: byKey('supplier_payable'),
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

  const invoice = await postSalesInvoice(
    { invoices, posting: ledgerPosting, stock, items },
    {
      companyId,
      companyStateCode: '27',
      customerId: customer.id,
      customerStateCode: '27',
      invoiceNumber: 'INV-1001',
      invoiceDate: '2026-07-11',
      paymentMode: 'credit',
      salesAccountId: byKey('sales'),
      outputGstAccountId: byKey('output_gst'),
      receivableAccountId: byKey('customer_receivable'),
      cashAccountId: byKey('cash'),
      lines: [
        {
          itemId: item.id,
          description: 'Cotton Fabric',
          quantity: '20',
          unit: 'meter',
          rate: '120.00',
          gstRate: '5.00',
        },
      ],
    },
  )

  const bill = await postPurchaseBill(
    { bills, posting: ledgerPosting, stock },
    {
      companyId,
      companyStateCode: '27',
      financialYearStart: '2026-04-01',
      supplierId: supplier.id,
      supplierStateCode: '24',
      supplierBillNumber: 'SUP-1001',
      billDate: '2026-07-10',
      dueDate: '2026-07-25',
      purchaseAccountId: byKey('purchase'),
      inputGstAccountId: byKey('input_gst'),
      payableAccountId: byKey('supplier_payable'),
      stockAccountId: byKey('stock_in_hand'),
      lines: [
        {
          itemId: item.id,
          description: 'Cotton Fabric',
          quantity: '50',
          unit: 'meter',
          rate: '80.00',
          gstRate: '5.00',
        },
      ],
    },
  )

  return {
    companyId,
    item,
    invoice,
    bill,
    stock,
    ledgerPosting,
    notes,
    customer,
    supplier,
    salesAccountId: byKey('sales'),
    outputGstAccountId: byKey('output_gst'),
    receivableAccountId: byKey('customer_receivable'),
    purchaseAccountId: byKey('purchase'),
    inputGstAccountId: byKey('input_gst'),
    payableAccountId: byKey('supplier_payable'),
  }
}

describe('postSalesReturn', () => {
  test('increases stock, reverses output GST, and reduces customer balance', async () => {
    const context = await seedReturnsContext()

    const salesReturn = await postSalesReturn(
      { posting: context.ledgerPosting, stock: context.stock, notes: context.notes },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        salesInvoiceId: context.invoice.id,
        returnDate: '2026-07-12',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
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

    expect(
      await getCurrentStock(context.stock, context.companyId, context.item.id),
    ).toBe('135')
    expect(salesReturn.taxableAmount).toBe('600.00')
    expect(salesReturn.totalGstAmount).toBe('30.00')
    expect(salesReturn.totalAmount).toBe('630.00')

    const entry = context.ledgerPosting.list().at(-1)!
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.salesAccountId,
      )?.debit,
    ).toBe('600.00')
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.outputGstAccountId,
      )?.debit,
    ).toBe('30.00')
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.receivableAccountId,
      )?.credit,
    ).toBe('630.00')

    expect(salesReturn.noteNumber).toMatch(/^CN-/)
    const notes = await context.notes.listByCompanyId(context.companyId)
    expect(notes).toHaveLength(1)
    expect(notes[0]?.noteType).toBe('credit')
    expect(notes[0]?.partyId).toBe(context.customer.id)
    expect(notes[0]?.totalAmount).toBe('630.00')
  })
})

describe('postPurchaseReturn', () => {
  test('decreases stock, reverses input GST, and reduces supplier balance', async () => {
    const context = await seedReturnsContext()

    const purchaseReturn = await postPurchaseReturn(
      { posting: context.ledgerPosting, stock: context.stock, notes: context.notes },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        supplierId: context.supplier.id,
        supplierStateCode: '24',
        purchaseBillId: context.bill.id,
        returnDate: '2026-07-12',
        purchaseAccountId: context.purchaseAccountId,
        inputGstAccountId: context.inputGstAccountId,
        payableAccountId: context.payableAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '10',
            unit: 'meter',
            rate: '80.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    // opening 100 - sale 20 + purchase 50 - purchase return 10 = 120
    expect(
      await getCurrentStock(context.stock, context.companyId, context.item.id),
    ).toBe('120')
    expect(purchaseReturn.taxableAmount).toBe('800.00')
    expect(purchaseReturn.totalGstAmount).toBe('40.00')
    expect(purchaseReturn.totalAmount).toBe('840.00')

    const entry = context.ledgerPosting.list().at(-1)!
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.payableAccountId,
      )?.debit,
    ).toBe('840.00')
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.purchaseAccountId,
      )?.credit,
    ).toBe('800.00')
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.inputGstAccountId,
      )?.credit,
    ).toBe('40.00')

    expect(purchaseReturn.noteNumber).toMatch(/^DN-/)
    const notes = await context.notes.listByCompanyId(context.companyId)
    expect(notes).toHaveLength(1)
    expect(notes[0]?.noteType).toBe('debit')
    expect(notes[0]?.partyId).toBe(context.supplier.id)
    expect(notes[0]?.totalAmount).toBe('840.00')
  })
})
