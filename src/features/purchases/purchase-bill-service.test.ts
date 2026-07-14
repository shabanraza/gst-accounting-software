import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { getCurrentStock } from '#/features/inventory/stock-movement-service.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import {
  DuplicateSupplierBillError,
  postPurchaseBill,
} from '#/features/purchases/purchase-bill-service.ts'
import type {
  PurchaseBillRepository,
  PurchaseBillRecord,
} from '#/features/purchases/purchase-bill-service.ts'

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

  list() {
    return this.bills
  }
}

async function seedPurchaseContext() {
  const ledgerAccounts = new InMemoryLedgerAccountRepository()
  const ledgerPosting = new InMemoryLedgerPostingRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()
  const stock = new InMemoryStockStore()
  const bills = new InMemoryPurchaseBillRepository()

  const companyId = 'company-1'
  const accounts = await setupDefaultChartOfAccounts(ledgerAccounts, {
    companyId,
    businessType: 'wholesale',
  })

  const purchaseAccountId = accounts.find(
    (account) => account.systemKey === 'purchase',
  )!.id
  const inputGstAccountId = accounts.find(
    (account) => account.systemKey === 'input_gst',
  )!.id
  const payableAccountId = accounts.find(
    (account) => account.systemKey === 'supplier_payable',
  )!.id
  const stockAccountId = accounts.find(
    (account) => account.systemKey === 'stock_in_hand',
  )!.id

  const supplier = await createParty(parties, {
    companyId,
    name: 'Textile Mills Ltd',
    partyType: 'supplier',
    gstin: '24AABCU9603R1ZM',
    stateCode: '24',
    addressLine1: 'GIDC Road, Unit 4',
    city: 'Surat',
    pincode: '395001',
    creditLimit: null,
    paymentTermsDays: 15,
    receivableAccountId: null,
    payableAccountId,
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

  return {
    companyId,
    accounts,
    purchaseAccountId,
    inputGstAccountId,
    payableAccountId,
    stockAccountId,
    supplier,
    item,
    ledgerPosting,
    stock,
    bills,
    parties,
  }
}

describe('postPurchaseBill', () => {
  test('posts purchase bill for 100 meters at Rs. 80 with 5% GST', async () => {
    const context = await seedPurchaseContext()

    const bill = await postPurchaseBill(
      {
        bills: context.bills,
        posting: context.ledgerPosting,
        stock: context.stock,
        parties: context.parties,
      },
      {
        companyId: context.companyId,
        companyStateCode: '27',
        financialYearStart: '2026-04-01',
        supplierId: context.supplier.id,
        supplierBillNumber: 'SUP-1001',
        billDate: '2026-07-11',
        dueDate: '2026-07-26',
        purchaseAccountId: context.purchaseAccountId,
        inputGstAccountId: context.inputGstAccountId,
        payableAccountId: context.payableAccountId,
        stockAccountId: context.stockAccountId,
        lines: [
          {
            itemId: context.item.id,
            description: 'Cotton Fabric',
            quantity: '100',
            unit: 'meter',
            rate: '80.00',
            gstRate: '5.00',
          },
        ],
      },
    )

    expect(
      await getCurrentStock(context.stock, context.companyId, context.item.id),
    ).toBe('100')
    expect(bill.taxableAmount).toBe('8000.00')
    expect(bill.totalGstAmount).toBe('400.00')
    expect(bill.totalAmount).toBe('8400.00')
    expect(context.ledgerPosting.list()).toHaveLength(1)

    const entry = context.ledgerPosting.list()[0]
    const stockLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.stockAccountId,
    )
    const gstLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.inputGstAccountId,
    )
    const payableLine = entry.lines.find(
      (line) => line.ledgerAccountId === context.payableAccountId,
    )

    expect(stockLine?.debit).toBe('8000.00')
    expect(gstLine?.debit).toBe('400.00')
    expect(payableLine?.credit).toBe('8400.00')
  })

  test('blocks duplicate supplier bill number for same supplier/company/financial year', async () => {
    const context = await seedPurchaseContext()

    const input = {
      companyId: context.companyId,
      companyStateCode: '27',
      financialYearStart: '2026-04-01',
      supplierId: context.supplier.id,
      supplierBillNumber: 'SUP-1001',
      billDate: '2026-07-11',
      dueDate: '2026-07-26',
      purchaseAccountId: context.purchaseAccountId,
      inputGstAccountId: context.inputGstAccountId,
      payableAccountId: context.payableAccountId,
      stockAccountId: context.stockAccountId,
      lines: [
        {
          itemId: context.item.id,
          description: 'Cotton Fabric',
          quantity: '100',
          unit: 'meter',
          rate: '80.00',
          gstRate: '5.00',
        },
      ],
    }

    await postPurchaseBill(
      {
        bills: context.bills,
        posting: context.ledgerPosting,
        stock: context.stock,
        parties: context.parties,
      },
      input,
    )

    await expect(
      postPurchaseBill(
        {
          bills: context.bills,
          posting: context.ledgerPosting,
          stock: context.stock,
          parties: context.parties,
        },
        input,
      ),
    ).rejects.toBeInstanceOf(DuplicateSupplierBillError)
  })
})
