import { describe, expect, test } from 'vitest'

import { createGstReconciliationRepository } from '#/features/gst/gst-reconciliation-store.ts'
import { buildGstr3bWorkingReport } from '#/features/gst/gstr3b-working-service.ts'
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

function bill(): PurchaseBillRecord {
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

describe('buildGstr3bWorkingReport', () => {
  test('uses accepted ITC from 2B reconciliation for net payable', async () => {
    const recon = createGstReconciliationRepository()
    const portalRows = [
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
    ]

    await recon.setGstr2bItcDecision({
      companyId: 'company-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      rowKey: '24AABCU9603R1ZM|SB-1|2026-01-06',
      status: 'accepted',
      updatedAt: new Date(),
    })

    const report = await buildGstr3bWorkingReport(
      {
        bills: new FakeBills([bill()]),
        parties: new FakeParties([supplierParty()]),
        recon,
      },
      {
        companyId: 'company-1',
        companyStateCode: '24',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        portalRows,
        documents: [],
      },
    )

    expect(report.acceptedInputGst).toBe('90.00')
    expect(report.pendingInputGst).toBe('0.00')
    expect(Number(report.netGstPayableWithAcceptedItc)).toBeLessThanOrEqual(
      Number(report.netGstPayableWithBooksItc),
    )
  })
})
