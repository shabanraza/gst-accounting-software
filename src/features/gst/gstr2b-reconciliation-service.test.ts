import { describe, expect, test } from 'vitest'

import { reconcileGstr2b } from '#/features/gst/gstr2b-reconciliation-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'

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

describe('reconcileGstr2b', () => {
  test('matches a bill against a portal row with equal amounts', async () => {
    const report = await reconcileGstr2b(
      { bills: new FakeBills([bill({})]) },
      'company-1',
      [
        {
          supplierGstin: '24AABCU9603R1ZM',
          supplierInvoiceNumber: 'SB-1',
          invoiceDate: '2026-01-06',
          taxableAmount: '500.00',
          totalGstAmount: '90.00',
        },
      ],
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.status).toBe('matched')
  })

  test('flags mismatched amounts', async () => {
    const report = await reconcileGstr2b(
      { bills: new FakeBills([bill({})]) },
      'company-1',
      [
        {
          supplierGstin: '24AABCU9603R1ZM',
          supplierInvoiceNumber: 'SB-1',
          invoiceDate: '2026-01-06',
          taxableAmount: '450.00',
          totalGstAmount: '81.00',
        },
      ],
    )

    expect(report.rows[0]?.status).toBe('mismatched')
  })

  test('flags bills missing from 2B and 2B rows missing from books', async () => {
    const report = await reconcileGstr2b(
      { bills: new FakeBills([bill({ supplierBillNumber: 'SB-BOOKS-ONLY' })]) },
      'company-1',
      [
        {
          supplierGstin: '24AABCU9603R1ZM',
          supplierInvoiceNumber: 'SB-PORTAL-ONLY',
          invoiceDate: '2026-01-06',
          taxableAmount: '100.00',
          totalGstAmount: '18.00',
        },
      ],
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
})
