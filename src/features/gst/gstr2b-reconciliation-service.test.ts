import { describe, expect, test } from 'vitest'

import {
  createGstReconciliationRepository,
  type GstReconciliationRepository,
} from '#/features/gst/gst-reconciliation-store.ts'
import {
  reconcileGstr2b,
  Gstr2bItcDecisionError,
  purchaseAmountsMatch,
  setGstr2bItcDecision,
} from '#/features/gst/gstr2b-reconciliation-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'

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

function supplierParty(): PartyRecord {
  return {
    id: 'party-2',
    companyId: 'company-1',
    name: 'Supplier',
    partyType: 'supplier',
    gstin: '24AABCU9603R1ZM',
    stateCode: '24',
    email: null,
    phone: null,
    address: null,
    openingBalance: '0.00',
    balanceType: 'credit',
    createdAt: new Date(),
  }
}

const period = {
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  companyStateCode: '24',
}

describe('reconcileGstr2b', () => {
  test('matches a bill against a portal row with equal amounts', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({})]),
        parties: new FakeParties([supplierParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-1',
            invoiceDate: '2026-01-06',
            taxableAmount: '500.00',
            cgstAmount: '45.00',
            sgstAmount: '45.00',
            igstAmount: '0.00',
            totalGstAmount: '90.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.status).toBe('matched')
    expect(report.summary.matchedCount).toBe(1)
  })

  test('flags mismatched amounts', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({})]),
        parties: new FakeParties([supplierParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-1',
            invoiceDate: '2026-01-06',
            taxableAmount: '450.00',
            cgstAmount: '40.50',
            sgstAmount: '40.50',
            igstAmount: '0.00',
            totalGstAmount: '81.00',
          },
        ],
      },
    )

    expect(report.rows[0]?.status).toBe('mismatched')
  })

  test('flags bills missing from 2B and 2B rows missing from books', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({ supplierBillNumber: 'SB-BOOKS-ONLY' })]),
        parties: new FakeParties([supplierParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-PORTAL-ONLY',
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
    const booksOnly = report.rows.find(
      (row) => row.supplierInvoiceNumber === 'SB-BOOKS-ONLY',
    )
    const portalOnly = report.rows.find(
      (row) => row.supplierInvoiceNumber === 'SB-PORTAL-ONLY',
    )
    expect(booksOnly?.status).toBe('missing_in_2b')
    expect(portalOnly?.status).toBe('missing_in_books')
  })

  test('excludes rows outside the selected period', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({ billDate: '2026-02-10' })]),
        parties: new FakeParties([supplierParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-1',
            invoiceDate: '2026-02-10',
            taxableAmount: '500.00',
            cgstAmount: '45.00',
            sgstAmount: '45.00',
            igstAmount: '0.00',
            totalGstAmount: '90.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(0)
  })

  test('does not auto-match bills when book party has no GSTIN', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({ supplierBillNumber: 'SB-1' })]),
        parties: new FakeParties([
          {
            ...supplierParty(),
            gstin: null,
          },
        ]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-1',
            invoiceDate: '2026-01-06',
            taxableAmount: '500.00',
            cgstAmount: '45.00',
            sgstAmount: '45.00',
            igstAmount: '0.00',
            totalGstAmount: '90.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(2)
    const booksRow = report.rows.find(
      (row) => row.supplierInvoiceNumber === 'SB-1' && row.bookTaxableAmount,
    )
    const portalRow = report.rows.find(
      (row) => row.supplierInvoiceNumber === 'SB-1' && row.portalTaxableAmount,
    )
    expect(booksRow?.status).toBe('missing_in_2b')
    expect(portalRow?.status).toBe('missing_in_books')
  })

  test('persists accepted ITC decisions in summary', async () => {
    const recon: GstReconciliationRepository = createGstReconciliationRepository()
    const deps = {
      bills: new FakeBills([bill({})]),
      parties: new FakeParties([supplierParty()]),
      recon,
    }
    const input = {
      companyId: 'company-1',
      ...period,
      portalRows: [
        {
          supplierGstin: '24AABCU9603R1ZM',
          supplierInvoiceNumber: 'SB-1',
          invoiceDate: '2026-01-06',
          taxableAmount: '500.00',
          cgstAmount: '45.00',
          sgstAmount: '45.00',
          igstAmount: '0.00',
          totalGstAmount: '90.00',
        },
      ],
    }

    const initial = await reconcileGstr2b(deps, input)
    await setGstr2bItcDecision(
      { recon, bills: deps.bills, parties: deps.parties },
      {
        companyId: 'company-1',
        companyStateCode: period.companyStateCode,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        rowKey: initial.rows[0]!.rowKey,
        status: 'accepted',
        portalRows: input.portalRows,
      },
    )

    const updated = await reconcileGstr2b(deps, input)
    expect(updated.summary.acceptedItcTotal).toBe('90.00')
    expect(updated.rows[0]?.itcStatus).toBe('accepted')
  })

  test('does not match portal rows when supplier GSTIN is missing on books', async () => {
    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([bill({})]),
        parties: new FakeParties([
          { ...supplierParty(), gstin: null },
        ]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [
          {
            supplierGstin: '24AABCU9603R1ZM',
            supplierInvoiceNumber: 'SB-1',
            invoiceDate: '2026-01-06',
            taxableAmount: '500.00',
            cgstAmount: '45.00',
            sgstAmount: '45.00',
            igstAmount: '0.00',
            totalGstAmount: '90.00',
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(2)
    expect(report.rows.some((row) => row.status === 'matched')).toBe(false)
  })

  test('treats half-split CGST/SGST rounding as matched when total GST matches', () => {
    expect(
      purchaseAmountsMatch(
        { taxableAmount: '500.00', totalGstAmount: '90.00' },
        { cgstAmount: '45.00', sgstAmount: '45.00', igstAmount: '0.00' },
        {
          taxableAmount: '500.00',
          cgstAmount: '45.01',
          sgstAmount: '44.99',
          igstAmount: '0.00',
          totalGstAmount: '90.00',
        },
      ),
    ).toBe(true)
  })

  test('flags duplicate portal keys as conflicts', async () => {
    const portalRow = {
      supplierGstin: '24AABCU9603R1ZM',
      supplierInvoiceNumber: 'SB-DUP',
      invoiceDate: '2026-01-06',
      taxableAmount: '100.00',
      cgstAmount: '9.00',
      sgstAmount: '9.00',
      igstAmount: '0.00',
      totalGstAmount: '18.00',
    }

    const report = await reconcileGstr2b(
      {
        bills: new FakeBills([]),
        parties: new FakeParties([supplierParty()]),
      },
      {
        companyId: 'company-1',
        ...period,
        portalRows: [portalRow, { ...portalRow }],
      },
    )

    expect(report.summary.conflictCount).toBe(2)
    expect(report.rows.every((row) => row.status === 'conflict')).toBe(true)
  })

  test('rejects ITC accept for non-matched rows', async () => {
    const recon = createGstReconciliationRepository()
    const deps = {
      bills: new FakeBills([bill({ supplierBillNumber: 'SB-ONLY-BOOKS' })]),
      parties: new FakeParties([supplierParty()]),
      recon,
    }
    const portalRows = [
      {
        supplierGstin: '24AABCU9603R1ZM',
        supplierInvoiceNumber: 'SB-PORTAL-ONLY',
        invoiceDate: '2026-01-06',
        taxableAmount: '100.00',
        cgstAmount: '9.00',
        sgstAmount: '9.00',
        igstAmount: '0.00',
        totalGstAmount: '18.00',
      },
    ]
    const report = await reconcileGstr2b(
      { ...deps },
      { companyId: 'company-1', ...period, portalRows },
    )
    const missingInBooks = report.rows.find(
      (row) => row.status === 'missing_in_books',
    )

    await expect(
      setGstr2bItcDecision(
        { recon, bills: deps.bills, parties: deps.parties },
        {
          companyId: 'company-1',
          companyStateCode: period.companyStateCode,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          rowKey: missingInBooks!.rowKey,
          status: 'accepted',
          portalRows,
        },
      ),
    ).rejects.toBeInstanceOf(Gstr2bItcDecisionError)
  })
})
