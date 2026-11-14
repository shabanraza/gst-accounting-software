// @vitest-environment jsdom
import Decimal from 'decimal.js'
import { describe, expect, test } from 'vitest'

import {
  buildTallyXml,
  escapeXml,
} from '#/features/exports/tally-xml-export-service.ts'
import { parseTallyMasters } from '#/features/imports/tally-xml-parser.ts'

import type { TallyExportInput } from '#/features/exports/tally-xml-export-service.ts'

const ids = {
  cash: 'acc-cash',
  receivable: 'acc-receivable',
  payable: 'acc-payable',
  sales: 'acc-sales',
  outputGst: 'acc-output-gst',
  rent: 'acc-rent',
  customer: 'party-customer',
  supplier: 'party-supplier',
  yarn: 'item-yarn',
  service: 'item-service',
}

function baseInput(
  overrides: Partial<TallyExportInput> = {},
): TallyExportInput {
  return {
    companyStateCode: '27',
    from: '2026-04-01',
    to: '2026-04-30',
    ledgers: [
      { id: ids.cash, name: 'Cash', accountType: 'asset', systemKey: 'cash' },
      {
        id: ids.receivable,
        name: 'Customer Receivable',
        accountType: 'asset',
        systemKey: 'customer_receivable',
      },
      {
        id: ids.payable,
        name: 'Supplier Payable',
        accountType: 'liability',
        systemKey: 'supplier_payable',
      },
      {
        id: ids.sales,
        name: 'Sales',
        accountType: 'income',
        systemKey: 'sales',
      },
      {
        id: ids.outputGst,
        name: 'Output GST',
        accountType: 'liability',
        systemKey: 'output_gst',
      },
      { id: ids.rent, name: 'Rent', accountType: 'expense', systemKey: null },
    ],
    parties: [
      {
        id: ids.customer,
        name: 'Asha & Sons <Pune>',
        partyType: 'customer',
        gstin: '27AAAAA0000A1Z5',
        stateCode: '27',
        addressLine1: '12 MG Road',
        addressLine2: '',
        city: 'Pune',
        pincode: '411001',
      },
      {
        id: ids.supplier,
        name: 'Gujarat Mills',
        partyType: 'supplier',
        gstin: null,
        stateCode: '24',
      },
    ],
    items: [
      {
        id: ids.yarn,
        name: 'Cotton Yarn',
        hsnCode: '52051200',
        gstRate: '18',
        baseUnit: 'Kg',
      },
      {
        id: ids.service,
        name: 'Packing',
        hsnCode: '998541',
        gstRate: '0',
        baseUnit: 'Nos',
      },
    ],
    entries: [],
    invoices: [],
    bills: [],
    notes: [],
    ...overrides,
  }
}

const intraStateInvoice: TallyExportInput['invoices'][number] = {
  customerId: ids.customer,
  invoiceNumber: 'INV-0001',
  invoiceDate: '2026-04-10',
  placeOfSupply: '27',
  paymentMode: 'credit',
  status: 'posted',
  narration: 'April order',
  totalGstAmount: '180.00',
  totalAmount: '1230.00',
  partyNameSnapshot: 'Asha & Sons <Pune>',
  lines: [
    {
      itemId: ids.yarn,
      description: 'Cotton Yarn',
      quantity: '10',
      unit: 'Kg',
      rate: '100.00',
      discountPercent: '0',
      taxableAmount: '1000.00',
    },
  ],
}

const interStateBill: TallyExportInput['bills'][number] = {
  supplierId: ids.supplier,
  supplierBillNumber: 'GM/77',
  billDate: '2026-04-12',
  placeOfSupply: '24',
  narration: '',
  totalGstAmount: '90.00',
  totalAmount: '590.00',
  partyNameSnapshot: 'Gujarat Mills',
  lines: [
    {
      itemId: ids.yarn,
      description: 'Cotton Yarn',
      quantity: '5',
      unit: 'Kg',
      rate: '100.00',
      discountPercent: '0',
      taxableAmount: '500.00',
    },
  ],
}

function parse(xml: string): Document {
  // Tally's reserved-name marker (&#4;) is not legal XML 1.0.
  const doc = new DOMParser().parseFromString(
    xml.replace(/&#4;/g, ''),
    'text/xml',
  )
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  return doc
}

function text(element: Element, tagName: string): string {
  return element.getElementsByTagName(tagName).item(0)?.textContent ?? ''
}

function vouchersOf(xml: string): Array<Element> {
  return [...parse(xml).getElementsByTagName('VOUCHER')]
}

function ledgerEntries(voucher: Element) {
  return [...voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST')].map(
    (entry) => ({
      ledger: text(entry, 'LEDGERNAME'),
      deemedPositive: text(entry, 'ISDEEMEDPOSITIVE'),
      amount: text(entry, 'AMOUNT'),
    }),
  )
}

/** Ledger lines plus top-level inventory lines, as Tally balances them. */
function voucherTotal(voucher: Element): Decimal {
  const amounts = [
    ...voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST'),
    ...voucher.getElementsByTagName('ALLINVENTORYENTRIES.LIST'),
  ].map((entry) => {
    const amount = [...entry.children].find(
      (child) => child.tagName === 'AMOUNT',
    )
    return new Decimal(amount?.textContent ?? '0')
  })
  return amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0))
}

describe('escapeXml', () => {
  test('escapes markup characters and drops control characters', () => {
    expect(escapeXml(`A & B <C> "q" 'a'\u0004`)).toBe(
      'A &amp; B &lt;C&gt; &quot;q&quot; &apos;a&apos;',
    )
  })

  test('party names with & and < survive in masters and vouchers', () => {
    const result = buildTallyXml(baseInput({ invoices: [intraStateInvoice] }))
    expect(result.masters).toContain('NAME="Asha &amp; Sons &lt;Pune&gt;"')
    const [voucher] = vouchersOf(result.vouchers)
    expect(text(voucher, 'PARTYLEDGERNAME')).toBe('Asha & Sons <Pune>')
  })
})

describe('buildTallyXml masters', () => {
  const masters = parse(buildTallyXml(baseInput()).masters)
  const ledger = (name: string) =>
    [...masters.getElementsByTagName('LEDGER')].find(
      (element) => element.getAttribute('NAME') === name,
    )

  test('wraps masters in an Import Data envelope for All Masters', () => {
    expect(text(masters.documentElement, 'TALLYREQUEST')).toBe('Import Data')
    expect(text(masters.documentElement, 'REPORTNAME')).toBe('All Masters')
  })

  test('puts parties under Sundry Debtors and Creditors with GSTIN, state and address', () => {
    const customer = ledger('Asha & Sons <Pune>')!
    expect(text(customer, 'PARENT')).toBe('Sundry Debtors')
    expect(text(customer, 'PARTYGSTIN')).toBe('27AAAAA0000A1Z5')
    expect(text(customer, 'LEDSTATENAME')).toBe('Maharashtra')
    expect(
      [...customer.getElementsByTagName('ADDRESS')].map((a) => a.textContent),
    ).toEqual(['12 MG Road', 'Pune'])
    expect(text(customer, 'PINCODE')).toBe('411001')

    const supplier = ledger('Gujarat Mills')!
    expect(text(supplier, 'PARENT')).toBe('Sundry Creditors')
    expect(text(supplier, 'GSTREGISTRATIONTYPE')).toBe('Unregistered')
    expect(text(supplier, 'LEDSTATENAME')).toBe('Gujarat')
  })

  test('maps GST ledgers to Duties & Taxes and accounts to Tally groups', () => {
    for (const name of [
      'Output CGST',
      'Output SGST',
      'Input IGST',
      'Output GST',
    ]) {
      expect(text(ledger(name)!, 'PARENT')).toBe('Duties & Taxes')
    }
    expect(text(ledger('Output CGST')!, 'GSTDUTYHEAD')).toBe('Central Tax')
    expect(text(ledger('Cash')!, 'PARENT')).toBe('Cash-in-Hand')
    expect(text(ledger('Sales')!, 'PARENT')).toBe('Sales Accounts')
    expect(text(ledger('Rent')!, 'PARENT')).toBe('Indirect Expenses')
    expect(text(ledger('Customer Receivable')!, 'PARENT')).toBe(
      'Current Assets',
    )
  })

  test('exports units and stock items with HSN, GST rate and unit', () => {
    expect(
      [...masters.getElementsByTagName('UNIT')].map((u) =>
        u.getAttribute('NAME'),
      ),
    ).toEqual(['Kg', 'Nos'])
    const yarn = [...masters.getElementsByTagName('STOCKITEM')][0]
    expect(yarn.getAttribute('NAME')).toBe('Cotton Yarn')
    expect(text(yarn, 'BASEUNITS')).toBe('Kg')
    expect(text(yarn, 'HSNCODE')).toBe('52051200')
    const rates = [...yarn.getElementsByTagName('RATEDETAILS.LIST')].map(
      (rate) => [text(rate, 'GSTRATEDUTYHEAD'), text(rate, 'GSTRATE')],
    )
    expect(rates).toEqual([
      ['CGST', '9'],
      ['SGST/UTGST', '9'],
      ['IGST', '18'],
    ])
  })

  test('round-trips parties and items through the Tally importer', () => {
    const input = baseInput()
    const imported = parseTallyMasters(buildTallyXml(input).masters, '27')
    expect(imported.parties).toEqual(
      input.parties.map((party) => ({
        name: party.name,
        partyType: party.partyType,
        gstin: party.gstin,
        stateCode: party.stateCode,
      })),
    )
    expect(
      imported.items.map(({ name, hsn, gstRate, unit }) => ({
        name,
        hsn,
        gstRate,
        unit,
      })),
    ).toEqual(
      input.items.map((item) => ({
        name: item.name,
        hsn: item.hsnCode,
        gstRate: new Decimal(item.gstRate).toFixed(2),
        unit: item.baseUnit,
      })),
    )
  })
})

describe('buildTallyXml vouchers', () => {
  test('writes an intra-state sales invoice with CGST/SGST and Tally signs', () => {
    const result = buildTallyXml(baseInput({ invoices: [intraStateInvoice] }))
    const doc = parse(result.vouchers)
    expect(text(doc.documentElement, 'REPORTNAME')).toBe('Vouchers')
    const [voucher] = vouchersOf(result.vouchers)
    expect(voucher.getAttribute('VCHTYPE')).toBe('Sales')
    expect(text(voucher, 'DATE')).toBe('20260410')
    expect(text(voucher, 'VOUCHERNUMBER')).toBe('INV-0001')
    expect(ledgerEntries(voucher)).toEqual([
      {
        ledger: 'Asha & Sons <Pune>',
        deemedPositive: 'Yes',
        amount: '-1230.00',
      },
      { ledger: 'Output CGST', deemedPositive: 'No', amount: '90.00' },
      { ledger: 'Output SGST', deemedPositive: 'No', amount: '90.00' },
      // Freight and round-off beyond the item lines.
      { ledger: 'Sales', deemedPositive: 'No', amount: '50.00' },
    ])
    const [inventory] = voucher.getElementsByTagName('ALLINVENTORYENTRIES.LIST')
    expect(text(inventory, 'STOCKITEMNAME')).toBe('Cotton Yarn')
    expect(text(inventory, 'ACTUALQTY')).toBe('10 Kg')
    expect(text(inventory, 'RATE')).toBe('100.00/Kg')
    expect(text(inventory, 'AMOUNT')).toBe('1000.00')
    expect(voucherTotal(voucher).toFixed(2)).toBe('0.00')
  })

  test('writes an inter-state purchase with IGST', () => {
    const [voucher] = vouchersOf(
      buildTallyXml(baseInput({ bills: [interStateBill] })).vouchers,
    )
    expect(voucher.getAttribute('VCHTYPE')).toBe('Purchase')
    expect(text(voucher, 'REFERENCE')).toBe('GM/77')
    expect(ledgerEntries(voucher)).toEqual([
      { ledger: 'Gujarat Mills', deemedPositive: 'No', amount: '590.00' },
      { ledger: 'Input IGST', deemedPositive: 'Yes', amount: '-90.00' },
    ])
    expect(voucherTotal(voucher).toFixed(2)).toBe('0.00')
  })

  test('leaves out cancelled invoices and documents outside the period', () => {
    const result = buildTallyXml(
      baseInput({
        invoices: [
          { ...intraStateInvoice, status: 'cancelled' },
          { ...intraStateInvoice, invoiceDate: '2026-05-01' },
        ],
        bills: [{ ...interStateBill, billDate: '2026-03-31' }],
      }),
    )
    expect(vouchersOf(result.vouchers)).toHaveLength(0)
  })

  test('turns postings into receipt and journal vouchers and every voucher balances', () => {
    const result = buildTallyXml(
      baseInput({
        invoices: [intraStateInvoice],
        bills: [interStateBill],
        notes: [
          {
            noteType: 'credit',
            noteNumber: 'CN-0001',
            noteDate: '2026-04-20',
            partyId: ids.customer,
            totalGstAmount: '18.00',
            totalAmount: '118.00',
            ledgerEntryId: 'entry-note',
            narration: 'Return',
          },
        ],
        entries: [
          {
            id: 'entry-sale',
            entryDate: '2026-04-10',
            narration: 'Sales invoice INV-0001',
            voucherType: 'sales',
            lines: [
              {
                ledgerAccountId: ids.receivable,
                debit: '1230.00',
                credit: '0.00',
              },
              { ledgerAccountId: ids.sales, debit: '0.00', credit: '1230.00' },
            ],
          },
          {
            id: 'entry-note',
            entryDate: '2026-04-20',
            narration: 'Sales return',
            voucherType: 'journal',
            lines: [
              { ledgerAccountId: ids.sales, debit: '118.00', credit: '0.00' },
              {
                ledgerAccountId: ids.receivable,
                debit: '0.00',
                credit: '118.00',
              },
            ],
          },
          {
            id: 'entry-receipt',
            entryDate: '2026-04-15',
            narration: 'Receipt against INV-0001',
            voucherType: 'receipt',
            lines: [
              { ledgerAccountId: ids.cash, debit: '1000.00', credit: '0.00' },
              {
                ledgerAccountId: ids.receivable,
                debit: '0.00',
                credit: '1000.00',
              },
            ],
          },
          {
            id: 'entry-rent',
            entryDate: '2026-04-30',
            narration: 'April rent',
            voucherType: 'journal',
            lines: [
              { ledgerAccountId: ids.rent, debit: '2500.00', credit: '0.00' },
              { ledgerAccountId: ids.cash, debit: '0.00', credit: '2500.00' },
            ],
          },
        ],
      }),
    )
    const vouchers = vouchersOf(result.vouchers)
    expect(vouchers.map((voucher) => voucher.getAttribute('VCHTYPE'))).toEqual([
      'Sales',
      'Purchase',
      'Receipt',
      'Credit Note',
      'Journal',
    ])
    expect(result.voucherCount).toBe(5)
    for (const voucher of vouchers) {
      expect(voucherTotal(voucher).toFixed(2)).toBe('0.00')
    }

    const receipt = vouchers[2]
    expect(ledgerEntries(receipt)).toEqual([
      { ledger: 'Cash', deemedPositive: 'Yes', amount: '-1000.00' },
      { ledger: 'Asha & Sons <Pune>', deemedPositive: 'No', amount: '1000.00' },
    ])
    expect(text(receipt, 'BILLTYPE')).toBe('Agst Ref')

    expect(ledgerEntries(vouchers[3])).toEqual([
      { ledger: 'Asha & Sons <Pune>', deemedPositive: 'No', amount: '118.00' },
      { ledger: 'Output CGST', deemedPositive: 'Yes', amount: '-9.00' },
      { ledger: 'Output SGST', deemedPositive: 'Yes', amount: '-9.00' },
      { ledger: 'Sales', deemedPositive: 'Yes', amount: '-100.00' },
    ])
  })

  test('an empty period gives a valid vouchers envelope and full masters', () => {
    const result = buildTallyXml(baseInput())
    const doc = parse(result.vouchers)
    expect(text(doc.documentElement, 'TALLYREQUEST')).toBe('Import Data')
    expect(doc.getElementsByTagName('TALLYMESSAGE')).toHaveLength(0)
    expect(result.voucherCount).toBe(0)
    expect(
      parse(result.masters).getElementsByTagName('LEDGER').length,
    ).toBeGreaterThan(0)
  })
})
