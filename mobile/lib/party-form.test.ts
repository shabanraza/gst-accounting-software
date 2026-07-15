import { describe, expect, it } from 'vitest'

import {
  buildCreatePartyInput,
  buildUpdatePartyInput,
  createInitialPartyForm,
  partyFormFromRecord,
  validatePartyForm,
  validatePartyLedgerMappings,
} from './party-form.ts'

const ledgerBySystemKey = {
  customer_receivable: 'ledger-ar',
  supplier_payable: 'ledger-ap',
}

describe('party-form', () => {
  it('validates required name and state', () => {
    const form = createInitialPartyForm()
    expect(validatePartyForm(form)).toBe('Party name is required.')

    form.name = 'Acme Traders'
    expect(validatePartyForm(form)).toBeNull()
  })

  it('requires receivable ledger for customers on create', () => {
    expect(
      validatePartyLedgerMappings({
        partyType: 'customer',
        ledgerBySystemKey: {},
        isEdit: false,
      }),
    ).toBe('Receivable ledger is missing for this company.')
  })

  it('requires payable ledger for suppliers on create', () => {
    expect(
      validatePartyLedgerMappings({
        partyType: 'supplier',
        ledgerBySystemKey: { supplier_payable: 'ledger-ap' },
        isEdit: false,
      }),
    ).toBeNull()
  })

  it('builds create payload with ledger mappings', () => {
    const form = createInitialPartyForm('customer')
    form.name = 'Acme Traders'
    form.gstin = '27aaaaa0000a1z5'

    expect(
      buildCreatePartyInput(form, {
        companyId: 'company-1',
        ledgerBySystemKey,
      }),
    ).toMatchObject({
      companyId: 'company-1',
      name: 'Acme Traders',
      partyType: 'customer',
      gstin: '27AAAAA0000A1Z5',
      receivableAccountId: 'ledger-ar',
      payableAccountId: null,
    })
  })

  it('maps party record into editable form', () => {
    const form = partyFormFromRecord({
      id: 'party-1',
      name: 'Fabric Mills',
      partyType: 'supplier',
      gstin: '27BBBBB0000B1Z5',
      pan: 'ABCDE1234F',
      stateCode: '27',
      addressLine1: 'Unit 2',
      addressLine2: '',
      city: 'Mumbai',
      pincode: '400001',
      contactPhone: '9999999999',
      contactEmail: 'buy@mills.test',
      creditLimit: '50000.00',
      paymentTermsDays: 30,
    })

    expect(form.name).toBe('Fabric Mills')
    expect(form.paymentTermsDays).toBe('30')
  })

  it('builds update payload', () => {
    const form = createInitialPartyForm('both')
    form.name = 'Updated Party'

    expect(
      buildUpdatePartyInput(form, {
        id: 'party-1',
        companyId: 'company-1',
      }),
    ).toMatchObject({
      id: 'party-1',
      companyId: 'company-1',
      name: 'Updated Party',
      partyType: 'both',
    })
  })
})
