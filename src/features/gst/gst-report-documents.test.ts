import { describe, expect, test } from 'vitest'

import { buildGstDocuments } from '#/features/gst/gst-report-documents.ts'
import { buildGstr1Report } from '#/features/gst/gstr1-report-service.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { CreditDebitNoteRecord } from '#/features/returns/credit-debit-note-service.ts'
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
      notes: new InMemoryCreditDebitNoteRepository(),
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

function party(id: string, overrides: { gstin: string | null; stateCode: string }) {
  return {
    id,
    companyId: 'company-1',
    name: `Party ${id}`,
    partyType: 'customer' as const,
    creditLimit: null,
    paymentTermsDays: 0,
    receivableAccountId: 'recv-1',
    payableAccountId: null,
    contactPhone: '',
    createdAt: new Date(),
    ...overrides,
  }
}

function note(
  overrides: Partial<CreditDebitNoteRecord> = {},
): CreditDebitNoteRecord {
  return {
    id: 'note-1',
    companyId: 'company-1',
    noteType: 'credit',
    noteNumber: 'CN-1',
    noteDate: '2026-07-20',
    partyId: 'party-1',
    referenceDocumentId: 'inv-1',
    taxableAmount: '200.00',
    totalGstAmount: '36.00',
    totalAmount: '236.00',
    ledgerEntryId: 'entry-2',
    narration: '',
    createdAt: new Date(),
    ...overrides,
  }
}

async function documentsFor(input: {
  invoices?: Array<SalesInvoiceRecord>
  notes?: Array<CreditDebitNoteRecord>
}) {
  const parties = new InMemoryPartyRepository()
  await parties.create(party('party-1', { gstin: '24AABCU9603R1ZM', stateCode: '24' }))
  await parties.create(party('party-2', { gstin: null, stateCode: '24' }))
  const invoices = new InMemorySalesInvoiceRepository()
  for (const invoice of input.invoices ?? []) await invoices.create(invoice)
  const notes = new InMemoryCreditDebitNoteRepository()
  for (const record of input.notes ?? []) await notes.create(record)
  return buildGstDocuments({
    companyId: 'company-1',
    companyStateCode: '24',
    invoices,
    bills: new InMemoryPurchaseBillRepository(),
    parties,
    notes,
  })
}

describe('buildGstDocuments place of supply', () => {
  test('takes the place of supply from the sales invoice, not the party', async () => {
    const [document] = await documentsFor({
      invoices: [baseInvoice({ placeOfSupply: '27' })],
    })

    expect(document?.placeOfSupply).toBe('27')
    expect(document?.supplyType).toBe('inter_state')
    expect(document?.igstAmount).toBe('180.00')
    expect(document?.cgstAmount).toBe('0.00')
  })
})

describe('buildGstDocuments credit and debit notes', () => {
  test('turns a sales return credit note into a GST document of the original invoice', async () => {
    const documents = await documentsFor({
      invoices: [
        baseInvoice({
          placeOfSupply: '27',
          lines: [{ gstRate: '18.00' } as SalesInvoiceRecord['lines'][number]],
        }),
      ],
      notes: [note()],
    })
    const creditNote = documents.find(
      (document) => document.documentType === 'credit_note',
    )

    expect(creditNote).toMatchObject({
      invoiceNumber: 'CN-1',
      documentDate: '2026-07-20',
      partyGstin: '24AABCU9603R1ZM',
      placeOfSupply: '27',
      supplyType: 'inter_state',
      taxableAmount: '200.00',
      igstAmount: '36.00',
      originalInvoice: {
        invoiceNumber: 'INV-1',
        documentDate: '2026-07-14',
        totalAmount: '1180.00',
      },
      rateLines: [
        { gstRate: '18.00', taxableAmount: '200.00', gstAmount: '36.00' },
      ],
    })
  })

  test('nets credit notes in GSTR-1 and GSTR-3B, and keeps debit notes out of GSTR-1', async () => {
    const documents = await documentsFor({
      invoices: [baseInvoice()],
      notes: [
        note(),
        note({
          id: 'note-2',
          noteType: 'debit',
          noteNumber: 'DN-1',
          partyId: 'party-2',
          referenceDocumentId: 'bill-1',
          taxableAmount: '100.00',
          totalGstAmount: '18.00',
          totalAmount: '118.00',
        }),
      ],
    })
    const period = {
      companyId: 'company-1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      documents,
    }

    const gstr1 = buildGstr1Report(period)
    expect(gstr1.cdnr.map((line) => line.invoiceNumber)).toEqual(['CN-1'])
    expect(gstr1.cdnur).toHaveLength(0)
    expect(gstr1.totalTaxableValue).toBe('800.00')

    const gstr3b = buildGstr3bReport(period)
    expect(gstr3b.outwardTaxableValue).toBe('800.00')
    expect(gstr3b.outputGst).toBe('144.00')
    expect(gstr3b.inputGst).toBe('-18.00')
  })
})
