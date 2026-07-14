import { describe, expect, test } from 'vitest'

import {
  assertTaxInvoiceCompanyAddress,
  assertTaxInvoicePartyAddress,
  buildInvoicePartySnapshot,
  partySnapshotHasAddress,
  TaxInvoiceAddressRequiredError,
} from '#/features/gst/tax-invoice-compliance.ts'

import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'

function makeParty(overrides: Partial<PartyRecord> = {}): PartyRecord {
  return {
    id: 'party-1',
    companyId: 'company-1',
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    pan: '',
    stateCode: '27',
    addressLine1: 'Plot 8',
    addressLine2: '',
    city: 'Pune',
    pincode: '411001',
    contactPhone: '',
    contactEmail: '',
    billingAddress: '',
    shippingAddress: '',
    creditLimit: null,
    paymentTermsDays: 0,
    priceListId: null,
    receivableAccountId: null,
    payableAccountId: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeCompany(overrides: Partial<CompanyRecord> = {}): CompanyRecord {
  return {
    id: 'company-1',
    accountId: 'acct-1',
    legalName: 'Demo Textiles',
    tradeName: 'Demo Textiles',
    gstin: '27AAAAA0000A1Z5',
    pan: '',
    stateCode: '27',
    addressLine1: '12 MG Road',
    addressLine2: '',
    city: 'Mumbai',
    pincode: '400001',
    contactPhone: '',
    contactEmail: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    authorizedSignatory: '',
    logoUrl: '',
    invoiceTerms: '',
    financialYearStart: '2026-04-01',
    businessType: 'trading',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('tax invoice compliance', () => {
  test('requires billing address for registered parties', () => {
    expect(() =>
      assertTaxInvoicePartyAddress({
        partyName: 'Noor Retailers',
        partyGstin: '27AABCU9603R1ZM',
        billingAddress: '',
        invoiceTotal: '1000.00',
      }),
    ).toThrow(TaxInvoiceAddressRequiredError)
  })

  test('requires billing address for large unregistered invoices', () => {
    expect(() =>
      assertTaxInvoicePartyAddress({
        partyName: 'Walk-in',
        partyGstin: null,
        billingAddress: '',
        invoiceTotal: '60000.00',
      }),
    ).toThrow(TaxInvoiceAddressRequiredError)
  })

  test('allows small unregistered invoices without address', () => {
    expect(() =>
      assertTaxInvoicePartyAddress({
        partyName: 'Walk-in',
        partyGstin: null,
        billingAddress: '',
        invoiceTotal: '1200.00',
      }),
    ).not.toThrow()
  })

  test('requires company address when GSTIN is set', () => {
    expect(() =>
      assertTaxInvoiceCompanyAddress(
        makeCompany({ addressLine1: '', city: '', pincode: '' }),
      ),
    ).toThrow(TaxInvoiceAddressRequiredError)
  })

  test('builds party snapshot from structured address fields', () => {
    const snapshot = buildInvoicePartySnapshot(makeParty())

    expect(snapshot.partyNameSnapshot).toBe('Noor Retailers')
    expect(snapshot.partyBillingAddressSnapshot).toContain('Plot 8')
    expect(snapshot.partyStateCodeSnapshot).toBe('27')
  })

  test('partySnapshotHasAddress checks billing address not name', () => {
    const snapshot = buildInvoicePartySnapshot(
      makeParty({ addressLine1: '', city: '', pincode: '' }),
    )

    expect(partySnapshotHasAddress(snapshot)).toBe(false)
    expect(
      partySnapshotHasAddress(
        buildInvoicePartySnapshot(
          makeParty({ name: '', addressLine1: 'Plot 8' }),
        ),
      ),
    ).toBe(true)
  })
})
