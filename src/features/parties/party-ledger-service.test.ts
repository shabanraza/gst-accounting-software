import { describe, expect, test } from 'vitest'

import { buildPartyLedger } from '#/features/parties/party-ledger-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'
import type {
  CreditDebitNoteRecord,
  CreditDebitNoteRepository,
} from '#/features/returns/credit-debit-note-service.ts'

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
  async listByCompanyId(_companyId: string, options?: { partyId?: string }) {
    return this.invoices.filter(
      (invoice) => !options?.partyId || invoice.customerId === options.partyId,
    )
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
  async listByCompanyId(_companyId: string, options?: { partyId?: string }) {
    return this.bills.filter(
      (bill) => !options?.partyId || bill.supplierId === options.partyId,
    )
  }
}

class FakeNotes implements CreditDebitNoteRepository {
  constructor(private readonly notes: Array<CreditDebitNoteRecord>) {}
  async create(note: CreditDebitNoteRecord) {
    return note
  }
  async listByCompanyId() {
    return this.notes
  }
}

function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: 'company-1',
    customerId: 'party-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-01-05',
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
    billDate: '2026-01-06',
    dueDate: '2026-02-05',
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

describe('buildPartyLedger', () => {
  test('combines invoices, bills, and notes filtered by party and computes closing balance', async () => {
    const report = await buildPartyLedger(
      {
        invoices: new FakeInvoices([invoice({ customerId: 'party-1' })]),
        bills: new FakeBills([bill({ supplierId: 'party-2' })]),
        notes: new FakeNotes([
          {
            id: 'note-1',
            companyId: 'company-1',
            noteType: 'credit',
            noteNumber: 'CN-1',
            noteDate: '2026-01-10',
            partyId: 'party-1',
            referenceDocumentId: 'inv-1',
            taxableAmount: '100.00',
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            ledgerEntryId: 'entry-3',
            narration: '',
            createdAt: new Date(),
          },
        ]),
      },
      'company-1',
      'party-1',
    )

    expect(report.entries).toHaveLength(2)
    expect(report.totalDebit).toBe('1180.00')
    expect(report.totalCredit).toBe('118.00')
    expect(report.closingBalance).toBe('1062.00')
  })
})
