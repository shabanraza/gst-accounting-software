import { describe, expect, test } from 'vitest'

import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { getOwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'
import {
  recordPurchaseSummary,
  recordSalesSummary,
} from '#/features/dashboard/dashboard-summary-service.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { ExpenseRecord, ExpenseRepository } from '#/features/expenses/expense-service.ts'
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
      },
      companyId,
      asOfDate,
      '24',
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
    expect(snapshot.gstMtd.outputGst).toBe('180.00')
    expect(snapshot.gstMtd.inputGst).toBe('90.00')
  })
})
