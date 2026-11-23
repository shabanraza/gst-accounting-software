import { beforeEach, describe, expect, test } from 'vitest'

import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createEWayBillRouter } from '#/features/eway-bill/eway-bill-router.ts'
import { InMemoryEWayBillRepository } from '#/features/eway-bill/eway-bill-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { createSalesDocument } from '#/features/sales-documents/sales-document-service.ts'
import { InMemorySalesDocumentRepository } from '#/features/sales-documents/sales-document-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const userId = crypto.randomUUID()
const companyId = crypto.randomUUID()
const otherCompanyId = crypto.randomUUID()

const context: TRPCContext = {
  session: {
    user: { id: userId, email: 'owner@example.com', name: 'Test Owner' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
}

const company = {
  id: companyId,
  legalName: 'Sharma Traders Pvt Ltd',
  tradeName: 'Sharma Traders',
  gstin: '27AAACB1234C1Z5',
  stateCode: '27',
  addressLine1: 'Shop 4, Market Road',
  addressLine2: '',
  city: 'Mumbai',
  pincode: '400014',
} as unknown as CompanyRecord

async function seed(options: { gstin?: string | null } = {}) {
  const invoices = new InMemorySalesInvoiceRepository()
  const salesDocuments = new InMemorySalesDocumentRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()
  const eWayBills = new InMemoryEWayBillRepository()
  const audit = new InMemoryAuditLogRepository()
  const companyRecord = {
    ...company,
    gstin: options.gstin === undefined ? company.gstin : options.gstin,
  }

  const customer = await createParty(parties, {
    companyId,
    name: 'Kumar Stores',
    partyType: 'customer',
    gstin: '29AABCK5678D1Z2',
    addressLine1: '12 MG Road',
    city: 'Bengaluru',
    pincode: '560001',
    stateCode: '29',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: crypto.randomUUID(),
    payableAccountId: null,
  })
  const saree = await createItem(items, {
    companyId,
    name: 'Cotton saree',
    hsnCode: '5208',
    gstRate: '5',
    baseUnit: 'Piece',
    purchaseRate: '300.00',
    saleRate: '500.00',
    tracksInventory: true,
  })

  function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
    return {
      id: crypto.randomUUID(),
      companyId,
      customerId: customer.id,
      invoiceNumber: 'INV-0001',
      invoiceDate: '2026-11-20',
      placeOfSupply: '29',
      status: 'posted',
      totalAmount: '105000.00',
      vehicleNo: 'MH12AB1234',
      lrNumber: '',
      partyNameSnapshot: 'Kumar Stores',
      partyGstinSnapshot: '29AABCK5678D1Z2',
      partyStateCodeSnapshot: '29',
      lines: [
        {
          id: crypto.randomUUID(),
          itemId: saree.id,
          description: 'Cotton saree',
          quantity: '200',
          unit: 'Piece',
          rate: '500.00',
          gstRate: '5',
          discountPercent: '0',
          discountAmount: '0.00',
          taxableAmount: '100000.00',
          gstAmount: '5000.00',
          lineTotal: '105000.00',
          godownName: null,
        },
      ],
      ...overrides,
    } as SalesInvoiceRecord
  }

  const big = await invoices.create(invoice({}))
  const small = await invoices.create(
    invoice({
      invoiceNumber: 'INV-0002',
      totalAmount: '10500.00',
      lines: [
        {
          ...big.lines[0],
          quantity: '20',
          taxableAmount: '10000.00',
          gstAmount: '500.00',
        },
      ],
    }),
  )
  const foreign = await invoices.create(
    invoice({ companyId: otherCompanyId, invoiceNumber: 'X-1' }),
  )

  const challan = await createSalesDocument(
    salesDocuments,
    new InMemoryDocumentSequenceRepository(),
    {
      companyId,
      documentType: 'delivery_challan',
      documentNumber: 'DC-0001',
      documentDate: '2026-11-21',
      customerId: customer.id,
      lines: [
        {
          itemId: saree.id,
          description: 'Cotton saree',
          quantity: '120',
          unit: 'Piece',
          rate: '500.00',
        },
      ],
    },
  )

  const router = createTRPCRouter({
    eWayBills: createEWayBillRouter({
      eWayBills,
      invoices,
      salesDocuments,
      companies: { listByIds: async () => [companyRecord] },
      parties,
      items,
      audit,
    }),
  })
  return {
    caller: router.createCaller(context),
    big,
    small,
    foreign,
    challan,
    audit,
    invoices,
    eWayBills,
  }
}

const transport = {
  mode: 'road' as const,
  distanceKm: 980,
  vehicleNumber: 'MH12AB1234',
  vehicleType: 'regular' as const,
  transporterId: '',
  transporterName: '',
  transportDocNumber: '',
  transportDocDate: '' as const,
}

describe('e-way bill router', () => {
  beforeEach(async () => {
    resetMembershipRepositoryForTests()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
  })

  test('builds the portal JSON for a posted invoice with HSN from the item', async () => {
    const { caller, big } = await seed()
    const { fileName, json } = await caller.eWayBills.buildJson({
      companyId,
      source: { kind: 'invoice', id: big.id },
      deliveryPincode: '',
      transport,
    })

    expect(fileName).toBe('ewaybill-INV-0001.json')
    expect(json.billLists[0]).toMatchObject({
      docNo: 'INV-0001',
      fromTrdName: 'Sharma Traders',
      toPincode: 560001,
      igstValue: 5000,
      totInvValue: 105000,
      mainHsnCode: 5208,
    })
  })

  test('builds the JSON for a delivery challan, valuing it with the item GST', async () => {
    const { caller, challan } = await seed()
    const { json } = await caller.eWayBills.buildJson({
      companyId,
      source: { kind: 'challan', id: challan.id },
      deliveryPincode: '560002',
      transport: { ...transport, subSupplyType: 'line_sales' },
    })

    expect(json.billLists[0]).toMatchObject({
      docType: 'CHL',
      subSupplyType: 10,
      toPincode: 560002,
      totalValue: 60000,
      igstValue: 3000,
      totInvValue: 63000,
    })
  })

  test('records the EWB number, shows it on the document and logs it', async () => {
    const { caller, big, audit } = await seed()
    await caller.eWayBills.record({
      companyId,
      source: { kind: 'invoice', id: big.id },
      ewbNumber: '331012345678',
      ewbDate: '2026-11-20',
      validUntil: '2026-11-25',
      vehicleNumber: 'MH12AB1234',
      transportMode: 'road',
      distanceKm: 980,
      transporterId: '',
      transporterName: '',
    })

    const view = await caller.eWayBills.forDocument({
      companyId,
      source: { kind: 'invoice', id: big.id },
    })
    expect(view.record?.ewbNumber).toBe('331012345678')
    expect(view.prefill.vehicleNumber).toBe('MH12AB1234')
    expect((await audit.listByCompanyId(companyId)).at(0)).toMatchObject({
      action: 'e_way_bill.recorded',
    })
  })

  test('flags invoices above the threshold until the number is recorded', async () => {
    const { caller, big, small } = await seed()
    const range = { companyId, invoiceIds: [big.id, small.id] }

    expect(await caller.eWayBills.invoiceStatuses(range)).toEqual({
      [big.id]: 'due',
    })

    await caller.eWayBills.record({
      companyId,
      source: { kind: 'invoice', id: big.id },
      ewbNumber: '331012345678',
      ewbDate: '2026-11-20',
      validUntil: '2026-11-25',
      vehicleNumber: '',
      transportMode: 'road',
      distanceKm: 980,
      transporterId: '27AAACV9999Q1ZX',
      transporterName: 'VRL Logistics',
    })
    const after = await caller.eWayBills.invoiceStatuses(range)
    expect(after).toEqual({ [big.id]: 'recorded' })
    expect(after[small.id]).toBeUndefined()
  })

  test('shows no reminders for a company without a GSTIN', async () => {
    const { caller, big } = await seed({ gstin: null })
    expect(
      await caller.eWayBills.invoiceStatuses({
        companyId,
        invoiceIds: [big.id],
      }),
    ).toEqual({})
  })

  test('uses the party state for older invoices with no place of supply', async () => {
    const { caller, invoices, big } = await seed()
    const old = await invoices.create({
      ...big,
      id: crypto.randomUUID(),
      invoiceNumber: 'INV-OLD',
      placeOfSupply: '',
      partyStateCodeSnapshot: '27',
    })
    const { json } = await caller.eWayBills.buildJson({
      companyId,
      source: { kind: 'invoice', id: old.id },
      deliveryPincode: '411001',
      transport,
    })

    expect(json.billLists[0]).toMatchObject({
      actualToStateCode: 27,
      igstValue: 0,
      cgstValue: 2500,
      sgstValue: 2500,
    })
    // Rs 1,05,000 inside Maharashtra is above its Rs 1 lakh limit.
    expect(
      await caller.eWayBills.invoiceStatuses({
        companyId,
        invoiceIds: [old.id],
      }),
    ).toEqual({ [old.id]: 'due' })
  })

  test('refuses to save an e-way bill on a cancelled invoice', async () => {
    const { caller, invoices, big } = await seed()
    await invoices.save({ ...big, status: 'cancelled' })

    await expect(
      caller.eWayBills.record({
        companyId,
        source: { kind: 'invoice', id: big.id },
        ewbNumber: '331012345678',
        ewbDate: '2026-11-20',
        validUntil: '2026-11-25',
        vehicleNumber: 'MH12AB1234',
        transportMode: 'road',
        distanceKm: 980,
        transporterId: '',
        transporterName: '',
      }),
    ).rejects.toThrow(/cancelled/)
  })

  test('never reads or changes the documents or e-way bills of another company', async () => {
    const { caller, foreign, eWayBills } = await seed()
    await expect(
      caller.eWayBills.record({
        companyId,
        source: { kind: 'invoice', id: foreign.id },
        ewbNumber: '331012345678',
        ewbDate: '2026-11-20',
        validUntil: '2026-11-25',
        vehicleNumber: 'MH12AB1234',
        transportMode: 'road',
        distanceKm: 980,
        transporterId: '',
        transporterName: '',
      }),
    ).rejects.toThrow(/not found/i)
    await expect(
      caller.eWayBills.forDocument({
        companyId,
        source: { kind: 'challan', id: crypto.randomUUID() },
      }),
    ).rejects.toThrow(/not found/i)

    const theirs = await eWayBills.save({
      id: crypto.randomUUID(),
      companyId: otherCompanyId,
      salesInvoiceId: foreign.id,
      salesDocumentId: null,
      ewbNumber: '331012345678',
      ewbDate: '2026-11-20',
      validUntil: '2026-11-25',
      vehicleNumber: null,
      transportMode: 'road',
      distanceKm: 100,
      transporterId: '',
      transporterName: '',
      generatedAt: new Date(),
      updatedAt: new Date(),
    })
    await expect(
      caller.eWayBills.remove({ companyId, id: theirs.id }),
    ).rejects.toThrow(/not found/i)
    expect(
      await caller.eWayBills.invoiceStatuses({
        companyId,
        invoiceIds: [foreign.id],
      }),
    ).toEqual({})
  })

  test("refuses another company's invoice", async () => {
    const { caller, foreign } = await seed()
    await expect(
      caller.eWayBills.forDocument({
        companyId,
        source: { kind: 'invoice', id: foreign.id },
      }),
    ).rejects.toThrow(/not found/i)
  })
})
