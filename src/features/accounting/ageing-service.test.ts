import { describe, expect, test } from 'vitest'

import { buildPayablesAgeing, buildReceivablesAgeing } from '#/features/accounting/ageing-service.ts'
import type { PartyRecord, PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRecord, PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRecord, SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

class FakeParties implements PartyRepository {
  constructor(private readonly parties: Array<PartyRecord>) {}
  async findByCompanyAndName() {
    return null
  }
  async create(party: PartyRecord) {
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
    const recentRow = report.rows.find((row) => row.documentDate === '2026-02-20')
    const oldRow = report.rows.find((row) => row.documentDate === '2025-11-01')
    expect(recentRow?.bucket).toBe('0-30')
    expect(oldRow?.bucket).toBe('90+')
    expect(report.bucketTotals['90+']).toBe('1180.00')
  })
})

describe('buildPayablesAgeing', () => {
  test('buckets outstanding bills by days overdue', async () => {
    const asOf = new Date('2026-03-01')
    const bill: PurchaseBillRecord = {
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
    }

    const report = await buildPayablesAgeing(
      {
        bills: new FakeBills([bill]),
        parties: new FakeParties([]),
      },
      'company-1',
      asOf,
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.bucket).toBe('0-30')
    expect(report.bucketTotals['0-30']).toBe('590.00')
  })
})
