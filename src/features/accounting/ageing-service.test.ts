import { describe, expect, test } from 'vitest'

import {
  buildPayablesAgeing,
  buildReceivablesAgeing,
} from '#/features/accounting/ageing-service.ts'
import type { PartyOpeningBalanceRecord } from '#/features/parties/party-opening-balance-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

class FakeParties implements PartyRepository {
  constructor(private readonly parties: Array<PartyRecord>) {}
  async findById(id: string) {
    return this.parties.find((party) => party.id === id) ?? null
  }
  async findByCompanyAndName() {
    return null
  }
  async create(party: PartyRecord) {
    return party
  }
  async update(party: PartyRecord) {
    return party
  }
  async listByCompanyId() {
    return this.parties
  }
}

class FakeInvoices implements SalesInvoiceRepository {
  constructor(private readonly invoices: Array<SalesInvoiceRecord>) {}
  async create(record: SalesInvoiceRecord) {
    return record
  }
  async findById() {
    return null
  }
  async save(record: SalesInvoiceRecord) {
    return record
  }
  async listByCompanyId() {
    return this.invoices
  }
}

class FakeBills implements PurchaseBillRepository {
  constructor(private readonly bills: Array<PurchaseBillRecord>) {}
  async create(record: PurchaseBillRecord) {
    return record
  }
  async findById() {
    return null
  }
  async save(record: PurchaseBillRecord) {
    return record
  }
  async findBySupplierBillNumber(): Promise<PurchaseBillRecord | null> {
    return null
  }
  async listByCompanyId() {
    return this.bills
  }
}

function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: 'company-1',
    customerId: 'party-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-01-01',
    paymentMode: 'credit',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '180.00',
    totalAmount: '1180.00',
    outstandingAmount: '1180.00',
    ledgerEntryId: 'entry-1',
    lines: [],
    createdAt: new Date(),
    ...overrides,
  }
}

function bill(overrides: Partial<PurchaseBillRecord>): PurchaseBillRecord {
  return {
    id: 'bill-1',
    companyId: 'company-1',
    financialYearStart: '2025-04-01',
    supplierId: 'party-2',
    supplierBillNumber: 'SB-1',
    billDate: '2026-02-01',
    dueDate: '2026-03-01',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    taxableAmount: '500.00',
    totalGstAmount: '90.00',
    totalAmount: '590.00',
    outstandingAmount: '590.00',
    ledgerEntryId: 'entry-2',
    lines: [],
    createdAt: new Date(),
    ...overrides,
  }
}

describe('buildReceivablesAgeing', () => {
  test('buckets outstanding invoices by days overdue', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          invoice({ id: 'inv-recent', invoiceDate: '2026-02-20' }),
          invoice({ id: 'inv-old', invoiceDate: '2025-11-01' }),
          invoice({ id: 'inv-paid', outstandingAmount: '0.00' }),
        ]),
        parties: new FakeParties([
          {
            id: 'party-1',
            companyId: 'company-1',
            name: 'Acme Traders',
            partyType: 'customer',
            gstin: null,
            stateCode: '24',
            creditLimit: null,
            paymentTermsDays: 30,
            receivableAccountId: 'recv-1',
            payableAccountId: null,
            createdAt: new Date(),
          },
        ]),
      },
      'company-1',
      asOf,
    )

    expect(report.rows).toHaveLength(2)
    const recentRow = report.rows.find(
      (row) => row.documentDate === '2026-02-20',
    )
    const oldRow = report.rows.find((row) => row.documentDate === '2025-11-01')
    expect(recentRow?.bucket).toBe('1-30')
    expect(oldRow?.bucket).toBe('90+')
    expect(report.bucketTotals['90+']).toBe('1180.00')
  })

  test('buckets on days past due, not days since the invoice date', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          // Raised 59 days ago but on 75-day credit terms: not due yet.
          invoice({
            id: 'inv-not-due',
            invoiceNumber: 'INV-NOT-DUE',
            invoiceDate: '2026-01-01',
            dueDate: '2026-03-15',
          }),
          // Raised 90 days ago, due 10 days ago.
          invoice({
            id: 'inv-just-overdue',
            invoiceNumber: 'INV-JUST-OVERDUE',
            invoiceDate: '2025-12-01',
            dueDate: '2026-02-19',
          }),
          // Raised 120 days ago, due 45 days ago.
          invoice({
            id: 'inv-mid-overdue',
            invoiceNumber: 'INV-MID-OVERDUE',
            invoiceDate: '2025-11-01',
            dueDate: '2026-01-15',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    const rowByNumber = new Map(
      report.rows.map((row) => [row.documentNumber, row]),
    )

    expect(rowByNumber.get('INV-NOT-DUE')?.daysPastDue).toBe(0)
    expect(rowByNumber.get('INV-NOT-DUE')?.bucket).toBe('not-due')
    expect(rowByNumber.get('INV-JUST-OVERDUE')?.daysPastDue).toBe(10)
    expect(rowByNumber.get('INV-JUST-OVERDUE')?.bucket).toBe('1-30')
    expect(rowByNumber.get('INV-MID-OVERDUE')?.daysPastDue).toBe(45)
    expect(rowByNumber.get('INV-MID-OVERDUE')?.bucket).toBe('31-60')
    expect(report.bucketTotals['not-due']).toBe('1180.00')
    expect(report.bucketTotals['1-30']).toBe('1180.00')
    expect(report.bucketTotals['31-60']).toBe('1180.00')
    expect(report.bucketTotals['61-90']).toBe('0.00')
    expect(report.bucketTotals['90+']).toBe('0.00')
  })

  test('separates not-yet-due invoices from freshly overdue ones', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          invoice({
            id: 'inv-due-tomorrow',
            invoiceNumber: 'INV-DUE-TOMORROW',
            invoiceDate: '2026-01-01',
            dueDate: '2026-03-02',
          }),
          invoice({
            id: 'inv-due-today',
            invoiceNumber: 'INV-DUE-TODAY',
            invoiceDate: '2026-01-01',
            dueDate: '2026-03-01',
          }),
          invoice({
            id: 'inv-one-day-late',
            invoiceNumber: 'INV-ONE-DAY-LATE',
            invoiceDate: '2026-01-01',
            dueDate: '2026-02-28',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    const rowByNumber = new Map(
      report.rows.map((row) => [row.documentNumber, row]),
    )

    expect(rowByNumber.get('INV-DUE-TOMORROW')?.daysPastDue).toBe(0)
    expect(rowByNumber.get('INV-DUE-TOMORROW')?.bucket).toBe('not-due')
    expect(rowByNumber.get('INV-DUE-TODAY')?.daysPastDue).toBe(0)
    expect(rowByNumber.get('INV-DUE-TODAY')?.bucket).toBe('not-due')
    expect(rowByNumber.get('INV-ONE-DAY-LATE')?.daysPastDue).toBe(1)
    expect(rowByNumber.get('INV-ONE-DAY-LATE')?.bucket).toBe('1-30')
  })

  test('splits the 1-30 and 31-60 buckets on the thirtieth day past due', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          invoice({
            id: 'inv-30-days-late',
            invoiceNumber: 'INV-30-DAYS-LATE',
            invoiceDate: '2025-12-01',
            dueDate: '2026-01-30',
          }),
          invoice({
            id: 'inv-31-days-late',
            invoiceNumber: 'INV-31-DAYS-LATE',
            invoiceDate: '2025-12-01',
            dueDate: '2026-01-29',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    const rowByNumber = new Map(
      report.rows.map((row) => [row.documentNumber, row]),
    )

    expect(rowByNumber.get('INV-30-DAYS-LATE')?.daysPastDue).toBe(30)
    expect(rowByNumber.get('INV-30-DAYS-LATE')?.bucket).toBe('1-30')
    expect(rowByNumber.get('INV-31-DAYS-LATE')?.daysPastDue).toBe(31)
    expect(rowByNumber.get('INV-31-DAYS-LATE')?.bucket).toBe('31-60')
  })

  test('sums bucket totals across all five buckets', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          invoice({
            id: 'inv-not-due',
            invoiceNumber: 'INV-NOT-DUE',
            dueDate: '2026-04-01',
            outstandingAmount: '100.00',
          }),
          invoice({
            id: 'inv-1-30',
            invoiceNumber: 'INV-1-30',
            dueDate: '2026-02-20',
            outstandingAmount: '200.00',
          }),
          invoice({
            id: 'inv-31-60',
            invoiceNumber: 'INV-31-60',
            dueDate: '2026-01-15',
            outstandingAmount: '300.00',
          }),
          invoice({
            id: 'inv-61-90',
            invoiceNumber: 'INV-61-90',
            dueDate: '2025-12-15',
            outstandingAmount: '400.00',
          }),
          invoice({
            id: 'inv-90-plus',
            invoiceNumber: 'INV-90-PLUS',
            dueDate: '2025-10-01',
            outstandingAmount: '500.00',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    expect(report.bucketTotals).toEqual({
      'not-due': '100.00',
      '1-30': '200.00',
      '31-60': '300.00',
      '61-90': '400.00',
      '90+': '500.00',
    })
  })

  test('falls back to the invoice date when the due date is missing or invalid', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([
          invoice({
            id: 'inv-no-due',
            invoiceNumber: 'INV-NO-DUE',
            invoiceDate: '2025-11-01',
          }),
          invoice({
            id: 'inv-blank-due',
            invoiceNumber: 'INV-BLANK-DUE',
            invoiceDate: '2025-11-01',
            dueDate: '   ',
          }),
          invoice({
            id: 'inv-bad-due',
            invoiceNumber: 'INV-BAD-DUE',
            invoiceDate: '2025-11-01',
            dueDate: 'not-a-date',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    for (const row of report.rows) {
      expect(row.documentDate).toBe('2025-11-01')
      expect(row.daysPastDue).toBe(120)
      expect(row.bucket).toBe('90+')
    }
    expect(report.bucketTotals['90+']).toBe('3540.00')
  })
})

describe('buildPayablesAgeing', () => {
  test('buckets outstanding bills by days overdue', async () => {
    const asOf = new Date('2026-03-01')

    const report = await buildPayablesAgeing(
      {
        bills: new FakeBills([bill({})]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.daysPastDue).toBe(0)
    expect(report.rows[0]?.bucket).toBe('not-due')
    expect(report.bucketTotals['not-due']).toBe('590.00')
  })

  test('buckets on days past due, not days since the bill date', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildPayablesAgeing(
      {
        bills: new FakeBills([
          bill({
            id: 'bill-not-due',
            supplierBillNumber: 'SB-NOT-DUE',
            billDate: '2026-01-01',
            dueDate: '2026-03-15',
          }),
          bill({
            id: 'bill-mid-overdue',
            supplierBillNumber: 'SB-MID-OVERDUE',
            billDate: '2025-11-01',
            dueDate: '2026-01-15',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    const rowByNumber = new Map(
      report.rows.map((row) => [row.documentNumber, row]),
    )

    expect(rowByNumber.get('SB-NOT-DUE')?.daysPastDue).toBe(0)
    expect(rowByNumber.get('SB-NOT-DUE')?.bucket).toBe('not-due')
    expect(rowByNumber.get('SB-MID-OVERDUE')?.daysPastDue).toBe(45)
    expect(rowByNumber.get('SB-MID-OVERDUE')?.bucket).toBe('31-60')
    expect(report.bucketTotals['not-due']).toBe('590.00')
    expect(report.bucketTotals['1-30']).toBe('0.00')
    expect(report.bucketTotals['31-60']).toBe('590.00')
  })

  test('falls back to the bill date when the due date is missing', async () => {
    const asOf = new Date('2026-03-01')
    const report = await buildPayablesAgeing(
      {
        bills: new FakeBills([
          bill({
            id: 'bill-no-due',
            supplierBillNumber: 'SB-NO-DUE',
            billDate: '2025-11-01',
            dueDate: '',
          }),
        ]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    expect(report.rows[0]?.documentDate).toBe('2025-11-01')
    expect(report.rows[0]?.daysPastDue).toBe(120)
    expect(report.rows[0]?.bucket).toBe('90+')
  })
})

describe('opening balances in ageing', () => {
  function openingBalance(
    overrides: Partial<PartyOpeningBalanceRecord>,
  ): PartyOpeningBalanceRecord {
    return {
      id: 'ob-1',
      companyId: 'company-1',
      partyId: 'party-1',
      side: 'receivable',
      asOfDate: '2025-12-01',
      amount: '5000.00',
      outstandingAmount: '4000.00',
      partyAccountId: 'recv-1',
      ledgerEntryId: 'entry-ob',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }
  }

  const openingBalances = {
    listByCompanyId: async () => [
      openingBalance({}),
      openingBalance({ id: 'ob-settled', outstandingAmount: '0.00' }),
      openingBalance({
        id: 'ob-payable',
        partyId: 'party-2',
        side: 'payable',
        asOfDate: '2026-02-15',
        outstandingAmount: '700.00',
      }),
    ],
  }

  test('ages an unpaid customer opening balance from its date', async () => {
    const report = await buildReceivablesAgeing(
      {
        invoices: new FakeInvoices([invoice({ invoiceDate: '2026-02-20' })]),
        parties: new FakeParties([]),
        openingBalances,
      },
      'company-1',
      new Date('2026-03-01'),
    )

    expect(report.rows).toHaveLength(2)
    expect(report.rows[0]).toMatchObject({
      partyId: 'party-1',
      documentNumber: 'Opening balance',
      documentDate: '2025-12-01',
      dueDate: '2025-12-01',
      outstandingAmount: '4000.00',
      bucket: '61-90',
    })
    expect(report.bucketTotals['61-90']).toBe('4000.00')
  })

  test('ages an unpaid supplier opening balance in payables', async () => {
    const report = await buildPayablesAgeing(
      {
        bills: new FakeBills([]),
        parties: new FakeParties([]),
        openingBalances,
      },
      'company-1',
      new Date('2026-03-01'),
    )

    expect(report.rows).toEqual([
      expect.objectContaining({
        partyId: 'party-2',
        partyName: 'Supplier',
        documentNumber: 'Opening balance',
        outstandingAmount: '700.00',
        bucket: '1-30',
      }),
    ])
  })
})
