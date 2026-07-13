import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { postPurchaseBill } from '#/features/purchases/purchase-bill-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'
import { postSalesInvoice } from '#/features/sales/sales-invoice-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'
import {
  allocateCustomerReceipt,
  allocateSupplierPayment,
} from '#/features/payments/payment-service.ts'

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
}

class InMemoryPurchaseBillRepository implements PurchaseBillRepository {
  private bills: Array<PurchaseBillRecord> = []

  async findBySupplierBillNumber(input: {
    companyId: string
    supplierId: string
    supplierBillNumber: string
    financialYearStart: string
  }) {
    return (
      this.bills.find(
        (bill) =>
          bill.companyId === input.companyId &&
          bill.supplierId === input.supplierId &&
          bill.supplierBillNumber === input.supplierBillNumber &&
          bill.financialYearStart === input.financialYearStart,
      ) ?? null
    )
  }

  async create(bill: PurchaseBillRecord) {
    this.bills.push(bill)
    return bill
  }

  async findById(id: string) {
    return this.bills.find((bill) => bill.id === id) ?? null
  }

  async save(bill: PurchaseBillRecord) {
    const index = this.bills.findIndex((item) => item.id === bill.id)
    if (index >= 0) {
      this.bills[index] = bill
    }
    return bill
  }

  async listByCompanyId(companyId: string) {
    return this.bills.filter((bill) => bill.companyId === companyId)
  }
}

async function seedPaymentContext() {
  const ledgerAccounts = new InMemoryLedgerAccountRepository()
  const ledgerPosting = new InMemoryLedgerPostingRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()
  const stock = new InMemoryStockStore()
  const invoices = new InMemorySalesInvoiceRepository()
  const bills = new InMemoryPurchaseBillRepository()

  const companyId = crypto.randomUUID()
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
    creditLimit: '100000.00',
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
    invoice,
    bill,
    invoices,
    bills,
    ledgerPosting,
    cashAccountId: byKey('cash'),
    receivableAccountId: byKey('customer_receivable'),
    payableAccountId: byKey('supplier_payable'),
  }
}

describe('allocateCustomerReceipt', () => {
  test('marks invoice Paid after full receipt allocation', async () => {
    const context = await seedPaymentContext()

    const receipt = await allocateCustomerReceipt(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
      },
      {
        companyId: context.companyId,
        invoiceId: context.invoice.id,
        amount: '2520.00',
        receiptDate: '2026-07-12',
        cashAccountId: context.cashAccountId,
        receivableAccountId: context.receivableAccountId,
      },
    )

    const invoice = await context.invoices.findById(context.invoice.id)

    expect(receipt.allocatedAmount).toBe('2520.00')
    expect(invoice?.paymentStatus).toBe('Paid')
    expect(invoice?.outstandingAmount).toBe('0.00')
  })

  test('marks invoice Part paid after partial receipt', async () => {
    const context = await seedPaymentContext()

    await allocateCustomerReceipt(
      {
        invoices: context.invoices,
        posting: context.ledgerPosting,
      },
      {
        companyId: context.companyId,
        invoiceId: context.invoice.id,
        amount: '1000.00',
        receiptDate: '2026-07-12',
        cashAccountId: context.cashAccountId,
        receivableAccountId: context.receivableAccountId,
      },
    )

    const invoice = await context.invoices.findById(context.invoice.id)

    expect(invoice?.paymentStatus).toBe('Part paid')
    expect(invoice?.outstandingAmount).toBe('1520.00')
  })
})

describe('allocateSupplierPayment', () => {
  test('allocates supplier payment against purchase bill', async () => {
    const context = await seedPaymentContext()

    const payment = await allocateSupplierPayment(
      {
        bills: context.bills,
        posting: context.ledgerPosting,
      },
      {
        companyId: context.companyId,
        purchaseBillId: context.bill.id,
        amount: '4200.00',
        paymentDate: '2026-07-12',
        cashAccountId: context.cashAccountId,
        payableAccountId: context.payableAccountId,
      },
    )

    const bill = await context.bills.findById(context.bill.id)

    expect(payment.allocatedAmount).toBe('4200.00')
    expect(bill?.paymentStatus).toBe('Paid')
    expect(bill?.outstandingAmount).toBe('0.00')
  })
})
