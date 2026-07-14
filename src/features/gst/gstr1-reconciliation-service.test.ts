import { describe, expect, test } from 'vitest'

import { reconcileGstr1 } from '#/features/gst/gstr1-reconciliation-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

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
  async findByInvoiceNumber(): Promise<SalesInvoiceRecord | null> {
    return null
  }
  async listByCompanyId() {
    return this.invoices
  }
}

class FakeParties implements PartyRepository {
  constructor(private readonly parties: Array<PartyRecord>) {}
  async create(record: PartyRecord) {
    return record
  }
  async findById(id: string) {
    return this.parties.find((party) => party.id === id) ?? null
  }
  async save(record: PartyRecord) {
    return record
  }
  async listByCompanyId() {
    return this.parties
  }
}

function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: 'company-1',
    financialYearStart: '2025-04-01',
    customerId: 'party-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-01-06',
    dueDate: '2026-02-05',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
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

function customerParty(): PartyRecord {
  return {
    id: 'party-1',
    companyId: 'company-1',
    name: 'Customer',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    stateCode: '27',
    email: null,
    phone: null,
    address: null,
    openingBalance: '0.00',
    balanceType: 'debit',
    createdAt: new Date(),
  }
}

const period = {
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
}

describe('reconcileGstr1', () => {
  test('matches invoice against portal row with equal amounts', async () => {
    const report = await reconcileGstr1(
      {
        invoices: new FakeInvoices([invoice({})]),
        parties: new FakeParties([customerParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            customerGstin: '27AABCU9603R1ZM',
            invoiceNumber: 'INV-1',
            invoiceDate: '2026-01-06',
            taxableAmount: '1000.00',
            cgstAmount: '90.00',
            sgstAmount: '90.00',
            igstAmount: '0.00',
            totalGstAmount: '180.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.status).toBe('matched')
  })

  test('flags portal-only and books-only rows', async () => {
    const report = await reconcileGstr1(
      {
        invoices: new FakeInvoices([invoice({ invoiceNumber: 'BOOKS-ONLY' })]),
        parties: new FakeParties([customerParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            customerGstin: '27AABCU9603R1ZM',
            invoiceNumber: 'PORTAL-ONLY',
            invoiceDate: '2026-01-06',
            taxableAmount: '100.00',
            cgstAmount: '9.00',
            sgstAmount: '9.00',
            igstAmount: '0.00',
            totalGstAmount: '18.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(2)
    expect(
      report.rows.some((row) => row.status === 'missing_in_gstr1'),
    ).toBe(true)
    expect(report.rows.some((row) => row.status === 'missing_in_books')).toBe(
      true,
    )
  })
})
