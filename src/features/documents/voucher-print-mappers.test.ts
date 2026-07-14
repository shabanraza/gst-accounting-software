import { describe, expect, test } from 'vitest'

import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'

import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'

function makeCompany(): CompanyRecord {
  return {
    id: 'company-1',
    legalName: 'Demo Textiles Private Limited',
    tradeName: 'Demo Textiles',
    gstin: '27AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    stateCode: '27',
    addressLine1: '12 MG Road',
    addressLine2: 'Fort',
    city: 'Mumbai',
    pincode: '400001',
    contactPhone: '9876543210',
    contactEmail: 'billing@demo.test',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    authorizedSignatory: '',
    logoUrl: '',
    invoiceTerms: '',
    financialYearStart: '2026-04-01',
    createdAt: new Date('2026-01-01'),
  }
}

function makeParty(): PartyRecord {
  return {
    id: 'party-1',
    companyId: 'company-1',
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    stateCode: '27',
    addressLine1: 'Plot 8',
    addressLine2: 'Industrial Area',
    city: 'Pune',
    pincode: '411001',
    contactPhone: '9123456780',
    contactEmail: 'accounts@noor.test',
    billingAddress: '',
    shippingAddress: '',
    creditLimit: null,
    paymentTermsDays: 0,
    priceListId: null,
    receivableAccountId: 'ledger-1',
    payableAccountId: null,
    createdAt: new Date('2026-01-01'),
  }
}

describe('voucher print mappers', () => {
  test('maps company address lines for tax invoice header', () => {
    const company = toPrintCompany(makeCompany())

    expect(company.addressLine1).toBe('12 MG Road')
    expect(company.city).toBe('Mumbai')
    expect(company.pincode).toBe('400001')
  })

  test('builds party billing address from structured fields when billingAddress is empty', () => {
    const party = toPrintParty(makeParty())

    expect(party.billingAddress).toBe('Plot 8\nIndustrial Area\nPune - 411001')
    expect(party.shippingAddress).toBe('Plot 8\nIndustrial Area\nPune - 411001')
  })
})
