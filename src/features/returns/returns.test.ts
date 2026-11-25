import Decimal from 'decimal.js'
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
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
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
  const sequences = new InMemoryDocumentSequenceRepository()
  const financialYears = new InMemoryFinancialYearRepository()

  const companyId = 'company-1'
  await createFinancialYear(financialYears, {
    companyId,
    startDate: '2026-04-01',
  })
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
    billingAddress: '12 Market Road, Surat',
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
    billingAddress: '12 Market Road, Surat',
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
    value: '7000.00',
  })

  const invoice = await postSalesInvoice(
    { invoices, posting: ledgerPosting, stock, items, parties },
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
    { bills, posting: ledgerPosting, stock, items, parties },
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
    items,
    parties,
    invoice,
    bill,
    stock,
    ledgerPosting,
    notes,
    invoices,
    bills,
    sequences,
    financialYears,
    customer,
    supplier,
    salesAccountId: byKey('sales'),
    outputGstAccountId: byKey('output_gst'),
    receivableAccountId: byKey('customer_receivable'),
    purchaseAccountId: byKey('purchase'),
    inputGstAccountId: byKey('input_gst'),
    payableAccountId: byKey('supplier_payable'),
    stockAccountId: byKey('stock_in_hand'),
    cogsAccountId: byKey('cogs'),
  }
}

describe('postSalesReturn', () => {
  test('increases stock, reverses output GST, and reduces customer balance', async () => {
    const context = await seedReturnsContext()

    const salesReturn = await postSalesReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        invoices: context.invoices,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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

  test('posts a 0% return without an output GST line', async () => {
    const context = await seedReturnsContext()
    // A nil-rated line: returns follow the rate the document charged.
    await context.invoices.save({
      ...context.invoice,
      lines: context.invoice.lines.map((line) => ({ ...line, gstRate: '0.00' })),
    })

    const salesReturn = await postSalesReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        invoices: context.invoices,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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
            gstRate: '0.00',
          },
        ],
      },
    )

    expect(salesReturn.totalGstAmount).toBe('0.00')
    expect(salesReturn.totalAmount).toBe('600.00')

    const entry = context.ledgerPosting.list().at(-1)!
    expect(entry.lines).toHaveLength(2)
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.salesAccountId,
      )?.debit,
    ).toBe('600.00')
    expect(
      entry.lines.find(
        (line) => line.ledgerAccountId === context.receivableAccountId,
      )?.credit,
    ).toBe('600.00')

    const notes = await context.notes.listByCompanyId(context.companyId)
    expect(notes).toHaveLength(1)
    expect(notes[0]?.totalGstAmount).toBe('0.00')
    expect(notes[0]?.totalAmount).toBe('600.00')
  })
})

describe('postPurchaseReturn', () => {
  test('decreases stock, reverses input GST, and reduces supplier balance', async () => {
    const context = await seedReturnsContext()

    const purchaseReturn = await postPurchaseReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        bills: context.bills,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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

  test('posts a 0% return without an input GST line', async () => {
    const context = await seedReturnsContext()
    // A nil-rated line: returns follow the rate the document charged.
    await context.bills.save({
      ...context.bill,
      lines: context.bill.lines.map((line) => ({ ...line, gstRate: '0.00' })),
    })

    const purchaseReturn = await postPurchaseReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        bills: context.bills,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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
            gstRate: '0.00',
          },
        ],
      },
    )

    expect(purchaseReturn.totalAmount).toBe('800.00')
    const entry = context.ledgerPosting.list().at(-1)!
    expect(
      entry.lines.some(
        (line) => line.ledgerAccountId === context.inputGstAccountId,
      ),
    ).toBe(false)
  })
})

describe('return stock value', () => {
  const lineOf = (
    entry: {
      lines: Array<{ ledgerAccountId: string; debit: string; credit: string }>
    },
    accountId: string,
  ) => entry.lines.find((line) => line.ledgerAccountId === accountId)

  test('sales return brings stock back at the cost the invoice removed', async () => {
    const context = await seedReturnsContext()

    await postSalesReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        invoices: context.invoices,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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
        stockAccountId: context.stockAccountId,
        cogsAccountId: context.cogsAccountId,
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

    // Opening 100 @ 70; invoice took 20 @ 70; bill added 50 @ 80.
    const entry = context.ledgerPosting.list().at(-1)!
    expect(lineOf(entry, context.stockAccountId)?.debit).toBe('350.00')
    expect(lineOf(entry, context.cogsAccountId)?.credit).toBe('350.00')
    expect(
      await context.stock.getValue(context.companyId, context.item.id),
    ).toBe('9950.00')
  })

  test('purchase return removes stock at average cost and books the price difference to purchases', async () => {
    const context = await seedReturnsContext()

    await postPurchaseReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        bills: context.bills,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
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
        stockAccountId: context.stockAccountId,
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

    // 130 m worth 9600 → 10 m at average = 738.46.
    const entry = context.ledgerPosting.list().at(-1)!
    expect(lineOf(entry, context.payableAccountId)?.debit).toBe('840.00')
    expect(lineOf(entry, context.inputGstAccountId)?.credit).toBe('40.00')
    expect(lineOf(entry, context.stockAccountId)?.credit).toBe('738.46')
    expect(lineOf(entry, context.purchaseAccountId)?.credit).toBe('61.54')
    expect(
      await context.stock.getValue(context.companyId, context.item.id),
    ).toBe('8861.54')
  })
})

describe('credit and debit note numbers', () => {
  type ReturnsContext = Awaited<ReturnType<typeof seedReturnsContext>>

  function depsOf(context: ReturnsContext) {
    return {
      posting: context.ledgerPosting,
      stock: context.stock,
      notes: context.notes,
      invoices: context.invoices,
      bills: context.bills,
      sequences: context.sequences,
      financialYears: context.financialYears,
    }
  }

  function salesReturnInput(
    context: ReturnsContext,
    returnDate = '2026-07-12',
  ) {
    return {
      companyId: context.companyId,
      companyStateCode: '27',
      customerId: context.customer.id,
      customerStateCode: '27',
      salesInvoiceId: context.invoice.id,
      returnDate,
      salesAccountId: context.salesAccountId,
      outputGstAccountId: context.outputGstAccountId,
      receivableAccountId: context.receivableAccountId,
      lines: [
        {
          itemId: context.item.id,
          description: 'Cotton Fabric',
          quantity: '1',
          unit: 'meter',
          rate: '120.00',
          gstRate: '5.00',
        },
      ],
    }
  }

  function purchaseReturnInput(context: ReturnsContext) {
    return {
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
          quantity: '1',
          unit: 'meter',
          rate: '80.00',
          gstRate: '5.00',
        },
      ],
    }
  }

  test('numbers credit and debit notes in their own running series', async () => {
    const context = await seedReturnsContext()
    const deps = depsOf(context)

    const first = await postSalesReturn(deps, salesReturnInput(context))
    const debit = await postPurchaseReturn(deps, purchaseReturnInput(context))
    const second = await postSalesReturn(deps, salesReturnInput(context))

    expect(first.noteNumber).toBe('CN-0001')
    expect(debit.noteNumber).toBe('DN-0001')
    expect(second.noteNumber).toBe('CN-0002')
    const notes = await context.notes.listByCompanyId(context.companyId)
    expect(notes.map((note) => note.noteNumber)).toEqual([
      'CN-0001',
      'DN-0001',
      'CN-0002',
    ])
  })

  test('starts a new series in the financial year of the return date', async () => {
    const context = await seedReturnsContext()
    await createFinancialYear(context.financialYears, {
      companyId: context.companyId,
      startDate: '2027-04-01',
      isActive: false,
    })
    const deps = depsOf(context)

    await postSalesReturn(deps, salesReturnInput(context))
    const nextYear = await postSalesReturn(
      deps,
      salesReturnInput(context, '2027-04-15'),
    )

    expect(nextYear.noteNumber).toBe('CN-0001')
  })

  test('refuses a return before posting anything when there is no financial year', async () => {
    const context = await seedReturnsContext()
    const deps = {
      ...depsOf(context),
      financialYears: new InMemoryFinancialYearRepository(),
    }
    const entriesBefore = context.ledgerPosting.list().length

    await expect(
      postSalesReturn(deps, salesReturnInput(context)),
    ).rejects.toThrow(/financial year/i)

    expect(context.ledgerPosting.list()).toHaveLength(entriesBefore)
    expect(
      await getCurrentStock(context.stock, context.companyId, context.item.id),
    ).toBe('130')
  })
})

describe('returns against what is still owed', () => {
  type ReturnsContext = Awaited<ReturnType<typeof seedReturnsContext>>

  function depsOf(context: ReturnsContext) {
    return {
      posting: context.ledgerPosting,
      stock: context.stock,
      notes: context.notes,
      invoices: context.invoices,
      bills: context.bills,
      sequences: context.sequences,
      financialYears: context.financialYears,
    }
  }

  function salesReturnInput(context: ReturnsContext, quantity: string) {
    return {
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
          quantity,
          unit: 'meter',
          rate: '120.00',
          gstRate: '5.00',
        },
      ],
    }
  }

  function purchaseReturnInput(context: ReturnsContext, quantity: string) {
    return {
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
          quantity,
          unit: 'meter',
          rate: '80.00',
          gstRate: '5.00',
        },
      ],
    }
  }

  test('a credit note reduces the invoice amount due', async () => {
    const context = await seedReturnsContext()
    expect(context.invoice.outstandingAmount).toBe('2520.00')

    await postSalesReturn(depsOf(context), salesReturnInput(context, '5'))

    const invoice = await context.invoices.findById(context.invoice.id)
    expect(invoice?.outstandingAmount).toBe('1890.00')
    expect(invoice?.paymentStatus).toBe('Part paid')

    await postSalesReturn(depsOf(context), salesReturnInput(context, '15'))
    const settled = await context.invoices.findById(context.invoice.id)
    expect(settled?.outstandingAmount).toBe('0.00')
    expect(settled?.paymentStatus).toBe('Paid')
  })

  test('a credit note on a paid invoice leaves nothing due, never negative', async () => {
    const context = await seedReturnsContext()
    await context.invoices.save({
      ...context.invoice,
      outstandingAmount: '100.00',
      paymentStatus: 'Part paid',
    })

    await postSalesReturn(depsOf(context), salesReturnInput(context, '5'))

    const invoice = await context.invoices.findById(context.invoice.id)
    expect(invoice?.outstandingAmount).toBe('0.00')
    expect(invoice?.paymentStatus).toBe('Paid')
  })

  test('refuses returns worth more than the invoice, or against another party', async () => {
    const context = await seedReturnsContext()
    const entriesBefore = context.ledgerPosting.list().length

    await expect(
      postSalesReturn(depsOf(context), salesReturnInput(context, '21')),
    ).rejects.toThrow('Return quantity is more than the 20 billed')
    await expect(
      postSalesReturn(depsOf(context), {
        ...salesReturnInput(context, '1'),
        customerId: context.supplier.id,
      }),
    ).rejects.toThrow('Sales invoice not found')
    await expect(
      postSalesReturn(depsOf(context), {
        ...salesReturnInput(context, '1'),
        companyId: 'company-2',
      }),
    ).rejects.toThrow('Sales invoice not found')

    await postSalesReturn(depsOf(context), salesReturnInput(context, '10'))
    await expect(
      postSalesReturn(depsOf(context), salesReturnInput(context, '11')),
    ).rejects.toThrow('Returns cannot exceed the invoice total')

    expect(context.ledgerPosting.list()).toHaveLength(entriesBefore + 1)
    expect(await context.notes.listByCompanyId(context.companyId)).toHaveLength(
      1,
    )
  })

  test('a debit note reduces the bill amount due and checks the bill', async () => {
    const context = await seedReturnsContext()
    expect(context.bill.outstandingAmount).toBe('4200.00')

    await postPurchaseReturn(
      depsOf(context),
      purchaseReturnInput(context, '10'),
    )

    const bill = await context.bills.findById(context.bill.id)
    expect(bill?.outstandingAmount).toBe('3360.00')
    expect(bill?.paymentStatus).toBe('Part paid')

    await expect(
      postPurchaseReturn(depsOf(context), purchaseReturnInput(context, '41')),
    ).rejects.toThrow('Returns cannot exceed the bill total')
    await expect(
      postPurchaseReturn(depsOf(context), {
        ...purchaseReturnInput(context, '1'),
        supplierId: context.customer.id,
      }),
    ).rejects.toThrow('Purchase bill not found')
  })
})

describe('returns at the price the document actually charged', () => {
  test('a GST-inclusive invoice is returned at its inclusive price, not with GST added on top', async () => {
    const context = await seedReturnsContext()
    const inclusive = await postSalesInvoice(
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
        paymentMode: 'credit',
        taxMode: 'inclusive',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.salesAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '2',
            unit: 'meter',
            rate: '118.00',
            gstRate: '18.00',
          },
        ],
      },
    )

    const salesReturn = await postSalesReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        invoices: context.invoices,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        salesInvoiceId: inclusive.id,
        returnDate: '2026-07-12',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '1',
            unit: 'meter',
            rate: '118.00',
            gstRate: '18.00',
          },
        ],
      },
    )

    expect(salesReturn.taxableAmount).toBe('100.00')
    expect(salesReturn.totalGstAmount).toBe('18.00')
    expect(salesReturn.totalAmount).toBe('118.00')
  })

  test('a line discount on the bill carries into the return', async () => {
    const context = await seedReturnsContext()
    const discounted = await postPurchaseBill(
      {
        bills: context.bills,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        financialYearStart: '2026-04-01',
        supplierId: context.supplier.id,
        supplierStateCode: '24',
        supplierBillNumber: 'SUP-1002',
        billDate: '2026-07-10',
        dueDate: '2026-07-25',
        purchaseAccountId: context.purchaseAccountId,
        inputGstAccountId: context.inputGstAccountId,
        payableAccountId: context.payableAccountId,
        stockAccountId: context.stockAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '10',
            unit: 'meter',
            rate: '100.00',
            discountPercent: '10',
            gstRate: '5.00',
          },
        ],
      },
    )

    const purchaseReturn = await postPurchaseReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        bills: context.bills,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        supplierId: context.supplier.id,
        supplierStateCode: '24',
        purchaseBillId: discounted.id,
        returnDate: '2026-07-12',
        purchaseAccountId: context.purchaseAccountId,
        inputGstAccountId: context.inputGstAccountId,
        payableAccountId: context.payableAccountId,
        stockAccountId: context.stockAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '5',
            unit: 'meter',
            rate: '100.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(purchaseReturn.taxableAmount).toBe('450.00')
    expect(purchaseReturn.totalGstAmount).toBe('22.50')
    expect(purchaseReturn.totalAmount).toBe('472.50')
  })
})

describe('returns on a reverse charge bill', () => {
  async function seedReverseChargeBill() {
    const context = await seedReturnsContext()
    const rcmAccountId = crypto.randomUUID()
    const bill = await postPurchaseBill(
      {
        bills: context.bills,
        posting: context.ledgerPosting,
        stock: context.stock,
        items: context.items,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        financialYearStart: '2026-04-01',
        supplierId: context.supplier.id,
        supplierStateCode: '24',
        supplierBillNumber: 'SUP-RCM-1',
        billDate: '2026-07-10',
        dueDate: '2026-07-25',
        purchaseAccountId: context.purchaseAccountId,
        inputGstAccountId: context.inputGstAccountId,
        payableAccountId: context.payableAccountId,
        stockAccountId: context.stockAccountId,
        reverseCharge: true,
        reverseChargeAccountId: rcmAccountId,
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
    const deps = {
      posting: context.ledgerPosting,
      stock: context.stock,
      notes: context.notes,
      bills: context.bills,
      sequences: context.sequences,
      financialYears: context.financialYears,
    }
    const returnInput = {
      companyId: context.companyId,
      companyStateCode: '27',
      supplierId: context.supplier.id,
      supplierStateCode: '24',
      purchaseBillId: bill.id,
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
    }
    return { context, bill, deps, returnInput, rcmAccountId }
  }

  test('takes back only the value from the supplier and reverses our own GST liability', async () => {
    const { context, bill, deps, returnInput, rcmAccountId } =
      await seedReverseChargeBill()

    const purchaseReturn = await postPurchaseReturn(deps, {
      ...returnInput,
      reverseChargeAccountId: rcmAccountId,
    })

    expect(purchaseReturn.taxableAmount).toBe('800.00')
    expect(purchaseReturn.totalGstAmount).toBe('40.00')
    expect(purchaseReturn.totalAmount).toBe('800.00')

    const lines = context.ledgerPosting.list().at(-1)!.lines
    const amount = (id: string) => lines.find((line) => line.ledgerAccountId === id)
    expect(amount(context.payableAccountId)?.debit).toBe('800.00')
    expect(amount(context.purchaseAccountId)?.credit).toBe('800.00')
    expect(amount(context.inputGstAccountId)?.credit).toBe('40.00')
    expect(amount(rcmAccountId)?.debit).toBe('40.00')

    const saved = await context.bills.findById(bill.id)
    expect(saved?.outstandingAmount).toBe('0.00')
    const notes = await context.notes.listByCompanyId(context.companyId)
    expect(notes.at(0)?.totalAmount).toBe('800.00')
  })

  test('part returns add up to the bill value and clear what is owed', async () => {
    const { context, bill, deps, returnInput, rcmAccountId } =
      await seedReverseChargeBill()
    const returnQuantity = (quantity: string) =>
      postPurchaseReturn(deps, {
        ...returnInput,
        reverseChargeAccountId: rcmAccountId,
        lines: [{ ...returnInput.lines[0], quantity }],
      })

    const first = await returnQuantity('4')
    expect(first.totalAmount).toBe('320.00')
    expect((await context.bills.findById(bill.id))?.paymentStatus).toBe(
      'Part paid',
    )
    const second = await returnQuantity('6')

    expect(second.totalAmount).toBe('480.00')
    expect(second.totalGstAmount).toBe('24.00')
    const saved = await context.bills.findById(bill.id)
    expect(saved?.outstandingAmount).toBe('0.00')
    expect(saved?.paymentStatus).toBe('Paid')
  })

  test('needs the reverse charge ledger', async () => {
    const { deps, returnInput } = await seedReverseChargeBill()

    await expect(postPurchaseReturn(deps, returnInput)).rejects.toThrow(
      /reverse charge/i,
    )
  })
})

describe('part returns and repeated items', () => {
  async function inclusiveInvoice(
    context: Awaited<ReturnType<typeof seedReturnsContext>>,
    lines: Array<{ quantity: string; rate: string; discountPercent?: string }>,
  ) {
    return postSalesInvoice(
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
        invoiceNumber: `INV-${crypto.randomUUID().slice(0, 6)}`,
        invoiceDate: '2026-07-11',
        paymentMode: 'credit',
        taxMode: 'inclusive',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        cashAccountId: context.salesAccountId,
        lines: lines.map((line) => ({
          itemId: context.item.id,
          description: 'Cotton Fabric',
          unit: 'meter',
          gstRate: '18.00',
          ...line,
        })),
      },
    )
  }

  function returnOf(
    context: Awaited<ReturnType<typeof seedReturnsContext>>,
    invoiceId: string,
    quantity: string,
  ) {
    return postSalesReturn(
      {
        posting: context.ledgerPosting,
        stock: context.stock,
        notes: context.notes,
        invoices: context.invoices,
        sequences: context.sequences,
        financialYears: context.financialYears,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        customerId: context.customer.id,
        customerStateCode: '27',
        salesInvoiceId: invoiceId,
        returnDate: '2026-07-12',
        salesAccountId: context.salesAccountId,
        outputGstAccountId: context.outputGstAccountId,
        receivableAccountId: context.receivableAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity,
            unit: 'meter',
            rate: '100.00',
            gstRate: '18.00',
          },
        ],
      },
    )
  }

  test('returning 3 inclusive units one at a time credits 100 each and adds up to the invoice', async () => {
    const context = await seedReturnsContext()
    const invoice = await inclusiveInvoice(context, [
      { quantity: '3', rate: '100.00' },
    ])
    expect(invoice.totalAmount).toBe('300.00')

    const first = await returnOf(context, invoice.id, '1')
    const second = await returnOf(context, invoice.id, '1')
    const third = await returnOf(context, invoice.id, '1')

    expect(first.totalAmount).toBe('100.00')
    expect(second.totalAmount).toBe('100.00')
    expect(third.totalAmount).toBe('100.00')
    expect(
      new Decimal(first.taxableAmount)
        .plus(second.taxableAmount)
        .plus(third.taxableAmount)
        .toFixed(2),
    ).toBe(invoice.taxableAmount)
    expect((await context.invoices.findById(invoice.id))?.outstandingAmount).toBe('0.00')
  })

  test('an item on several lines is valued across all of them', async () => {
    const context = await seedReturnsContext()
    // 1 free unit plus 9 at 100: 10 units for 900 including GST.
    const invoice = await inclusiveInvoice(context, [
      { quantity: '1', rate: '100.00', discountPercent: '100' },
      { quantity: '9', rate: '100.00' },
    ])

    const salesReturn = await returnOf(context, invoice.id, '5')
    expect(salesReturn.totalAmount).toBe('450.00')
  })

  test('refuses to return more than was billed', async () => {
    const context = await seedReturnsContext()
    const invoice = await inclusiveInvoice(context, [
      { quantity: '3', rate: '100.00' },
    ])
    await expect(returnOf(context, invoice.id, '4')).rejects.toThrow(
      'Return quantity is more than the 3 billed',
    )
  })
})
