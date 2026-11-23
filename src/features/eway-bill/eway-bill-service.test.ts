import { describe, expect, test } from 'vitest'

import {
  EWAY_BILL_JSON_VERSION,
  InvalidEWayBillError,
  buildChallanLines,
  buildEWayBillJson,
  consignmentValue,
  defaultValidUntil,
  eWayBillThreshold,
  isEWayBillDue,
  recordEWayBill,
  removeEWayBill,
} from '#/features/eway-bill/eway-bill-service.ts'
import { InMemoryEWayBillRepository } from '#/features/eway-bill/eway-bill-store.ts'

import type {
  EWayBillCompany,
  EWayBillDocument,
  EWayBillParty,
  EWayBillTransport,
} from '#/features/eway-bill/eway-bill-service.ts'

const company: EWayBillCompany = {
  gstin: '27AAACB1234C1Z5',
  name: 'Sharma Traders',
  addressLine1: 'Shop 4, Market Road',
  addressLine2: 'Dadar',
  city: 'Mumbai',
  pincode: '400014',
  stateCode: '27',
}

const registeredParty: EWayBillParty = {
  gstin: '29AABCK5678D1Z2',
  name: 'Kumar Stores',
  addressLine1: '12 MG Road',
  addressLine2: '',
  city: 'Bengaluru',
  pincode: '560001',
  stateCode: '29',
}

const invoice: EWayBillDocument = {
  kind: 'invoice',
  number: 'INV-0042',
  date: '2026-11-20',
  placeOfSupply: '29',
  totalAmount: '70900.00',
  lines: [
    {
      productName: 'Cotton saree',
      description: 'Printed cotton saree',
      hsnCode: '5208',
      quantity: '100',
      unit: 'Piece',
      taxableAmount: '50000.00',
      gstRate: '5',
      gstAmount: '2500.00',
    },
    {
      productName: 'Steel trunk',
      description: '',
      hsnCode: '73269099',
      quantity: '10',
      unit: 'Nos',
      taxableAmount: '15000.00',
      gstRate: '18',
      gstAmount: '2700.00',
    },
  ],
}

const road: EWayBillTransport = {
  mode: 'road',
  distanceKm: 980,
  vehicleNumber: 'mh 12 ab 1234',
  vehicleType: 'regular',
  transporterId: '',
  transporterName: '',
  transportDocNumber: '',
  transportDocDate: '',
}

describe('eWayBillThreshold', () => {
  test('is ₹50,000 for movement between states', () => {
    expect(eWayBillThreshold('27', '29')).toBe('50000.00')
  })

  test('uses a higher limit a state has notified for movement inside it', () => {
    expect(eWayBillThreshold('27', '27')).toBe('100000.00')
  })

  test('falls back to ₹50,000 inside a state with no higher limit', () => {
    expect(eWayBillThreshold('24', '24')).toBe('50000.00')
  })
})

describe('consignmentValue', () => {
  test('adds taxable value and GST of taxable goods, leaving out exempt and service lines', () => {
    expect(
      consignmentValue([
        ...invoice.lines,
        {
          productName: 'Fresh vegetables',
          description: '',
          hsnCode: '0702',
          quantity: '5',
          unit: 'Kilogram',
          taxableAmount: '9000.00',
          gstRate: '0',
          gstAmount: '0.00',
        },
        {
          productName: 'Installation',
          description: '',
          hsnCode: '998729',
          quantity: '1',
          unit: 'Job',
          taxableAmount: '4000.00',
          gstRate: '18',
          gstAmount: '720.00',
        },
      ]),
    ).toBe('70200.00')
  })
})

describe('isEWayBillDue', () => {
  const base = {
    companyGstin: company.gstin,
    fromStateCode: '27',
    toStateCode: '29',
    cancelled: false,
    hasEWayBill: false,
    lines: invoice.lines,
  }

  test('is due for a posted invoice above the threshold with no e-way bill', () => {
    expect(isEWayBillDue(base)).toBe(true)
  })

  test('is not due at or below the threshold', () => {
    expect(
      isEWayBillDue({
        ...base,
        lines: [
          {
            ...invoice.lines[0],
            taxableAmount: '47619.05',
            gstAmount: '2380.95',
          },
        ],
      }),
    ).toBe(false)
  })

  test('is not due once the e-way bill number is recorded, for cancelled invoices, or without a GSTIN', () => {
    expect(isEWayBillDue({ ...base, hasEWayBill: true })).toBe(false)
    expect(isEWayBillDue({ ...base, cancelled: true })).toBe(false)
    expect(isEWayBillDue({ ...base, companyGstin: null })).toBe(false)
  })

  test('applies the state limit for movement inside the state', () => {
    expect(isEWayBillDue({ ...base, toStateCode: '27' })).toBe(false)
  })
})

describe('buildChallanLines', () => {
  test('values challan lines at quantity × rate and works out GST from the item rate', () => {
    expect(
      buildChallanLines(
        [
          {
            productName: 'Cotton saree',
            description: '',
            hsnCode: '5208',
            quantity: '3',
            unit: 'Piece',
            rate: '333.33',
            gstRate: '5',
          },
        ],
        { fromStateCode: '27', toStateCode: '27' },
      ),
    ).toEqual([
      {
        productName: 'Cotton saree',
        description: '',
        hsnCode: '5208',
        quantity: '3',
        unit: 'Piece',
        taxableAmount: '999.99',
        gstRate: '5',
        gstAmount: '50.00',
      },
    ])
  })
})

describe('buildEWayBillJson', () => {
  test('builds the bulk-upload JSON for an inter-state invoice by road', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: invoice,
      transport: road,
    })

    expect(json.version).toBe(EWAY_BILL_JSON_VERSION)
    expect(json.billLists).toHaveLength(1)
    expect(json.billLists[0]).toEqual({
      userGstin: '27AAACB1234C1Z5',
      supplyType: 'O',
      subSupplyType: 1,
      subSupplyDesc: '',
      docType: 'INV',
      docNo: 'INV-0042',
      docDate: '20/11/2026',
      transType: 1,
      fromGstin: '27AAACB1234C1Z5',
      fromTrdName: 'Sharma Traders',
      fromAddr1: 'Shop 4, Market Road',
      fromAddr2: 'Dadar',
      fromPlace: 'Mumbai',
      fromPincode: 400014,
      fromStateCode: 27,
      actualFromStateCode: 27,
      toGstin: '29AABCK5678D1Z2',
      toTrdName: 'Kumar Stores',
      toAddr1: '12 MG Road',
      toAddr2: '',
      toPlace: 'Bengaluru',
      toPincode: 560001,
      toStateCode: 29,
      actualToStateCode: 29,
      totalValue: 65000,
      cgstValue: 0,
      sgstValue: 0,
      igstValue: 5200,
      cessValue: 0,
      TotNonAdvolVal: 0,
      OthValue: 700,
      totInvValue: 70900,
      transMode: 1,
      transDistance: 980,
      transporterId: '',
      transporterName: '',
      transDocNo: '',
      transDocDate: '',
      vehicleNo: 'MH12AB1234',
      vehicleType: 'R',
      mainHsnCode: 5208,
      itemList: [
        {
          itemNo: 1,
          productName: 'Cotton saree',
          productDesc: 'Printed cotton saree',
          hsnCode: 5208,
          quantity: 100,
          qtyUnit: 'PCS',
          taxableAmount: 50000,
          sgstRate: 0,
          cgstRate: 0,
          igstRate: 5,
          cessRate: 0,
          cessNonAdvol: 0,
        },
        {
          itemNo: 2,
          productName: 'Steel trunk',
          productDesc: 'Steel trunk',
          hsnCode: 73269099,
          quantity: 10,
          qtyUnit: 'NOS',
          taxableAmount: 15000,
          sgstRate: 0,
          cgstRate: 0,
          igstRate: 18,
          cessRate: 0,
          cessNonAdvol: 0,
        },
      ],
    })
  })

  test('splits CGST and SGST equally inside a state and marks unregistered buyers as URP', () => {
    const json = buildEWayBillJson({
      company,
      party: {
        ...registeredParty,
        gstin: null,
        stateCode: '27',
        pincode: '411001',
        city: 'Pune',
      },
      document: {
        ...invoice,
        placeOfSupply: '27',
        totalAmount: '70200.00',
        lines: [{ ...invoice.lines[0] }, { ...invoice.lines[1] }],
      },
      transport: road,
    })
    const bill = json.billLists[0]

    expect(bill.toGstin).toBe('URP')
    expect(bill.cgstValue).toBe(2600)
    expect(bill.sgstValue).toBe(2600)
    expect(bill.igstValue).toBe(0)
    expect(bill.itemList[1]).toMatchObject({
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
    })
    expect(bill.OthValue).toBe(0)
  })

  test('leaves service lines out of the item list and counts them in other value', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: {
        ...invoice,
        totalAmount: '74920.00',
        lines: [
          ...invoice.lines,
          {
            productName: 'Installation',
            description: '',
            hsnCode: '998729',
            quantity: '1',
            unit: 'Job',
            taxableAmount: '4000.00',
            gstRate: '18',
            gstAmount: '720.00',
          },
        ],
      },
      transport: road,
    })

    expect(json.billLists[0].itemList).toHaveLength(2)
    expect(json.billLists[0].OthValue).toBe(4720)
  })

  test('sends exactly the bulk-upload fields', () => {
    const bill = buildEWayBillJson({
      company,
      party: registeredParty,
      document: invoice,
      transport: road,
    }).billLists[0]

    expect(Object.keys(bill).sort()).toEqual(
      [
        'userGstin',
        'supplyType',
        'subSupplyType',
        'subSupplyDesc',
        'docType',
        'docNo',
        'docDate',
        'transType',
        'fromGstin',
        'fromTrdName',
        'fromAddr1',
        'fromAddr2',
        'fromPlace',
        'fromPincode',
        'fromStateCode',
        'actualFromStateCode',
        'toGstin',
        'toTrdName',
        'toAddr1',
        'toAddr2',
        'toPlace',
        'toPincode',
        'toStateCode',
        'actualToStateCode',
        'totalValue',
        'cgstValue',
        'sgstValue',
        'igstValue',
        'cessValue',
        'TotNonAdvolVal',
        'OthValue',
        'totInvValue',
        'transMode',
        'transDistance',
        'transporterName',
        'transporterId',
        'transDocNo',
        'transDocDate',
        'vehicleNo',
        'vehicleType',
        'mainHsnCode',
        'itemList',
      ].sort(),
    )
  })

  test('carries a negative other value when the invoice was rounded down or discounted', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: { ...invoice, totalAmount: '69699.60' },
      transport: road,
    })

    expect(json.billLists[0].OthValue).toBe(-500.4)
    expect(json.billLists[0].totInvValue).toBe(69699.6)
  })

  test('sends the LR number by road when it is given with its date', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: invoice,
      transport: {
        ...road,
        transportDocNumber: 'LR-5521',
        transportDocDate: '2026-11-20',
      },
    })

    expect(json.billLists[0]).toMatchObject({
      vehicleNo: 'MH12AB1234',
      transDocNo: 'LR-5521',
      transDocDate: '20/11/2026',
    })
  })

  test('names the consignor as recipient when challan goods stay with the business', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: {
        ...invoice,
        kind: 'challan',
        number: 'DC-0008',
        totalAmount: '70200.00',
      },
      transport: { ...road, subSupplyType: 'exhibition' },
    })

    expect(json.billLists[0]).toMatchObject({
      subSupplyType: 12,
      toGstin: '27AAACB1234C1Z5',
      toTrdName: 'Sharma Traders',
      toStateCode: 27,
      toPincode: 560001,
      actualToStateCode: 29,
    })
  })

  test('rejects missing state codes and document numbers the portal cannot take', () => {
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: { ...invoice, placeOfSupply: '' },
        transport: road,
      }),
    ).toThrow(/state/)
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: { ...invoice, number: 'INV 2026-27 #00042' },
        transport: road,
      }),
    ).toThrow(/16 letters/)
  })

  test('uses the challan doc type and the reason picked for a delivery challan', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: {
        ...invoice,
        kind: 'challan',
        number: 'DC-0007',
        totalAmount: '70200.00',
      },
      transport: { ...road, subSupplyType: 'job_work' },
    })

    expect(json.billLists[0]).toMatchObject({
      docType: 'CHL',
      subSupplyType: 4,
      docNo: 'DC-0007',
    })
  })

  test('needs a description when the challan reason is Others', () => {
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: { ...invoice, kind: 'challan', totalAmount: '70200.00' },
        transport: {
          ...road,
          subSupplyType: 'others',
          subSupplyDescription: '',
        },
      }),
    ).toThrow(InvalidEWayBillError)
  })

  test('accepts Part A only when a transporter ID is given instead of a vehicle', () => {
    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: invoice,
      transport: {
        ...road,
        vehicleNumber: '',
        transporterId: '27aaacv9999q1zx',
        transporterName: 'VRL Logistics',
      },
    })

    expect(json.billLists[0]).toMatchObject({
      vehicleNo: '',
      transporterId: '27AAACV9999Q1ZX',
      transporterName: 'VRL Logistics',
    })
  })

  test('needs the transport document for rail, air and ship', () => {
    const rail = { ...road, mode: 'rail' as const, vehicleNumber: '' }
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: invoice,
        transport: rail,
      }),
    ).toThrow(/RR, airway bill or bill of lading/)

    const json = buildEWayBillJson({
      company,
      party: registeredParty,
      document: invoice,
      transport: {
        ...rail,
        transportDocNumber: 'RR998877',
        transportDocDate: '2026-11-21',
      },
    })
    expect(json.billLists[0]).toMatchObject({
      transMode: 2,
      transDocNo: 'RR998877',
      transDocDate: '21/11/2026',
      vehicleNo: '',
    })
  })

  test.each([
    ['no company GSTIN', { company: { ...company, gstin: null } }, /GSTIN/],
    ['a bad company PIN', { company: { ...company, pincode: '4000' } }, /PIN/],
    [
      'a bad delivery PIN',
      { party: { ...registeredParty, pincode: '' } },
      /PIN/,
    ],
    [
      'a distance over 4000 km',
      { transport: { ...road, distanceKm: 4001 } },
      /distance/i,
    ],
    [
      'no vehicle or transporter by road',
      { transport: { ...road, vehicleNumber: '' } },
      /vehicle number or transporter ID/,
    ],
    [
      'a malformed vehicle number',
      { transport: { ...road, vehicleNumber: 'ABC' } },
      /vehicle number/,
    ],
    [
      'a malformed transporter ID',
      { transport: { ...road, transporterId: '1234' } },
      /transporter ID/,
    ],
  ])('rejects %s', (_label, override, message) => {
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: invoice,
        transport: road,
        ...override,
      }),
    ).toThrow(message)
  })

  test('rejects goods lines without a 4-digit HSN code and documents with no goods', () => {
    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: {
          ...invoice,
          lines: [{ ...invoice.lines[0], hsnCode: '0000' }],
        },
        transport: road,
      }),
    ).toThrow(/HSN/)

    expect(() =>
      buildEWayBillJson({
        company,
        party: registeredParty,
        document: {
          ...invoice,
          lines: [{ ...invoice.lines[0], hsnCode: '998729' }],
        },
        transport: road,
      }),
    ).toThrow(/no goods/)
  })
})

describe('defaultValidUntil', () => {
  test('gives one day per 200 km, ending at midnight of the following day', () => {
    expect(defaultValidUntil('2026-11-20', 150, 'regular')).toBe('2026-11-21')
    expect(defaultValidUntil('2026-11-20', 200, 'regular')).toBe('2026-11-21')
    expect(defaultValidUntil('2026-11-20', 980, 'regular')).toBe('2026-11-25')
  })

  test('gives one day per 20 km for over-dimensional cargo', () => {
    expect(defaultValidUntil('2026-11-30', 45, 'odc')).toBe('2026-12-03')
  })

  test('suggests nothing when the portal works out the distance', () => {
    expect(defaultValidUntil('2026-11-20', 0, 'regular')).toBeNull()
  })
})

describe('recordEWayBill', () => {
  const input = {
    companyId: 'company-1',
    source: { kind: 'invoice' as const, id: 'invoice-1' },
    ewbNumber: '3310 1234 5678',
    ewbDate: '2026-11-20',
    validUntil: '2026-11-25',
    vehicleNumber: 'mh12ab1234',
    transportMode: 'road' as const,
    distanceKm: 980,
    transporterId: '',
    transporterName: '',
  }

  test('stores the e-way bill number and validity against the invoice', async () => {
    const repository = new InMemoryEWayBillRepository()
    const record = await recordEWayBill(repository, input)

    expect(record).toMatchObject({
      companyId: 'company-1',
      salesInvoiceId: 'invoice-1',
      salesDocumentId: null,
      ewbNumber: '331012345678',
      vehicleNumber: 'MH12AB1234',
      validUntil: '2026-11-25',
    })
    expect(
      await repository.findBySource('company-1', {
        kind: 'invoice',
        id: 'invoice-1',
      }),
    ).toEqual(record)
  })

  test('updates the same record when the vehicle or validity changes', async () => {
    const repository = new InMemoryEWayBillRepository()
    const first = await recordEWayBill(repository, input)
    const second = await recordEWayBill(repository, {
      ...input,
      vehicleNumber: 'MH14CD5678',
      validUntil: '2026-11-27',
    })

    expect(second.id).toBe(first.id)
    expect(await repository.listByCompanyId('company-1')).toHaveLength(1)
    expect(second.vehicleNumber).toBe('MH14CD5678')
  })

  test('stores against a delivery challan', async () => {
    const repository = new InMemoryEWayBillRepository()
    const record = await recordEWayBill(repository, {
      ...input,
      source: { kind: 'challan', id: 'challan-1' },
    })

    expect(record).toMatchObject({
      salesInvoiceId: null,
      salesDocumentId: 'challan-1',
    })
  })

  test.each([
    [
      'an EWB number that is not 12 digits',
      { ewbNumber: '12345' },
      /12 digits/,
    ],
    ['validity before the EWB date', { validUntil: '2026-11-19' }, /valid/i],
    ['a bad date', { ewbDate: '20-11-2026' }, /date/i],
  ])('rejects %s', async (_label, override, message) => {
    const repository = new InMemoryEWayBillRepository()
    await expect(
      recordEWayBill(repository, { ...input, ...override }),
    ).rejects.toThrow(message)
  })

  test('keeps companies apart', async () => {
    const repository = new InMemoryEWayBillRepository()
    await recordEWayBill(repository, input)

    expect(
      await repository.findBySource('company-2', {
        kind: 'invoice',
        id: 'invoice-1',
      }),
    ).toBeNull()
  })
})

describe('removeEWayBill', () => {
  test('removes the recorded number so it can be entered again', async () => {
    const repository = new InMemoryEWayBillRepository()
    const record = await recordEWayBill(repository, {
      companyId: 'company-1',
      source: { kind: 'invoice', id: 'invoice-1' },
      ewbNumber: '331012345678',
      ewbDate: '2026-11-20',
      validUntil: '2026-11-21',
      vehicleNumber: '',
      transportMode: 'road',
      distanceKm: 100,
      transporterId: '27AAACV9999Q1ZX',
      transporterName: 'VRL Logistics',
    })

    await removeEWayBill(repository, { companyId: 'company-1', id: record.id })
    expect(await repository.listByCompanyId('company-1')).toEqual([])
    await expect(
      removeEWayBill(repository, { companyId: 'company-1', id: record.id }),
    ).rejects.toThrow(/not found/)
  })
})
