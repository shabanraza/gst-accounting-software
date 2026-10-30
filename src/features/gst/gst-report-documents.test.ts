import { describe, expect, test } from 'vitest'

import { buildGstDocuments } from '#/features/gst/gst-report-documents.ts'
import { buildGstr1Report } from '#/features/gst/gstr1-report-service.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

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
    partyGstinSnapshot: '24AABCU9603R1ZM',
    partyPanSnapshot: '',
    partyBillingAddressSnapshot: '',
    partyShippingAddressSnapshot: '',
    partyStateCodeSnapshot: '24',
    partyPhoneSnapshot: '',
    partyEmailSnapshot: '',
    ...overrides,
  }
}

describe('buildGstDocuments', () => {
  test('leaves cancelled sales invoices out of GSTR-1 and GSTR-3B', async () => {
    const parties = new InMemoryPartyRepository()
    await parties.create({
      id: 'party-1',
      companyId: 'company-1',
      name: 'Acme Traders',
      partyType: 'customer',
      gstin: '24AABCU9603R1ZM',
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 0,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
      contactPhone: '',
      createdAt: new Date(),
    })
    const invoices = new InMemorySalesInvoiceRepository()
    await invoices.create(baseInvoice())
    await invoices.create(
      baseInvoice({
        id: 'inv-2',
        invoiceNumber: 'INV-2',
        status: 'cancelled',
        taxableAmount: '5000.00',
        totalGstAmount: '900.00',
        totalAmount: '5900.00',
      }),
    )

    const documents = await buildGstDocuments({
      companyId: 'company-1',
      companyStateCode: '24',
      invoices,
      bills: new InMemoryPurchaseBillRepository(),
      parties,
    })
    const period = {
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents,
    }

    const gstr1 = buildGstr1Report(period)
    expect(gstr1.b2b.map((line) => line.invoiceNumber)).toEqual(['INV-1'])
    expect(gstr1.totalTaxableValue).toBe('1000.00')

    const gstr3b = buildGstr3bReport(period)
    expect(gstr3b.outwardTaxableValue).toBe('1000.00')
    expect(gstr3b.outputGst).toBe('180.00')
  })
})
