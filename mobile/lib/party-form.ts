import { isValidStateCode } from './sales-invoice-form.ts'

export type PartyType = 'customer' | 'supplier' | 'both'

export type PartyFormDraft = {
  name: string
  partyType: PartyType
  gstin: string
  pan: string
  stateCode: string
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  contactPhone: string
  contactEmail: string
  creditLimit: string
  paymentTermsDays: string
}

export type PartyRecordLike = {
  id: string
  name: string
  partyType: PartyType
  gstin: string | null
  pan?: string | null
  stateCode: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  pincode?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  creditLimit: string | null
  paymentTermsDays: number
}

export function createInitialPartyForm(
  defaultPartyType: PartyType = 'customer',
): PartyFormDraft {
  return {
    name: '',
    partyType: defaultPartyType,
    gstin: '',
    pan: '',
    stateCode: '27',
    addressLine1: '',
    addressLine2: '',
    city: '',
    pincode: '',
    contactPhone: '',
    contactEmail: '',
    creditLimit: '',
    paymentTermsDays: '30',
  }
}

export function partyFormFromRecord(party: PartyRecordLike): PartyFormDraft {
  return {
    name: party.name,
    partyType: party.partyType,
    gstin: party.gstin ?? '',
    pan: party.pan ?? '',
    stateCode: party.stateCode,
    addressLine1: party.addressLine1 ?? '',
    addressLine2: party.addressLine2 ?? '',
    city: party.city ?? '',
    pincode: party.pincode ?? '',
    contactPhone: party.contactPhone ?? '',
    contactEmail: party.contactEmail ?? '',
    creditLimit: party.creditLimit ?? '',
    paymentTermsDays: String(party.paymentTermsDays),
  }
}

export function validatePartyForm(form: PartyFormDraft) {
  if (!form.name.trim()) {
    return 'Party name is required.'
  }

  if (!isValidStateCode(form.stateCode)) {
    return 'State must be a valid 2-digit state code.'
  }

  return null
}

export function validatePartyLedgerMappings(input: {
  partyType: PartyType
  ledgerBySystemKey: Partial<Record<string, string>>
  isEdit: boolean
}) {
  if (input.isEdit) {
    return null
  }

  if (
    (input.partyType === 'customer' || input.partyType === 'both') &&
    !input.ledgerBySystemKey.customer_receivable
  ) {
    return 'Receivable ledger is missing for this company.'
  }

  if (
    (input.partyType === 'supplier' || input.partyType === 'both') &&
    !input.ledgerBySystemKey.supplier_payable
  ) {
    return 'Payable ledger is missing for this company.'
  }

  return null
}

function contactPayload(form: PartyFormDraft) {
  return {
    pan: form.pan.trim(),
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim(),
    city: form.city.trim(),
    pincode: form.pincode.trim(),
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    billingAddress: '',
    shippingAddress: '',
  }
}

export function buildCreatePartyInput(
  form: PartyFormDraft,
  input: {
    companyId: string
    ledgerBySystemKey: Partial<Record<string, string>>
  },
) {
  const receivableAccountId =
    input.ledgerBySystemKey.customer_receivable ?? null
  const payableAccountId = input.ledgerBySystemKey.supplier_payable ?? null

  return {
    companyId: input.companyId,
    name: form.name.trim(),
    partyType: form.partyType,
    gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : null,
    stateCode: form.stateCode,
    creditLimit: form.creditLimit.trim() || null,
    paymentTermsDays: Number(form.paymentTermsDays) || 0,
    receivableAccountId:
      form.partyType === 'supplier' ? null : receivableAccountId,
    payableAccountId: form.partyType === 'customer' ? null : payableAccountId,
    priceListId: null,
    ...contactPayload(form),
  }
}

export function buildUpdatePartyInput(
  form: PartyFormDraft,
  input: {
    id: string
    companyId: string
  },
) {
  return {
    id: input.id,
    companyId: input.companyId,
    name: form.name.trim(),
    partyType: form.partyType,
    gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : null,
    stateCode: form.stateCode,
    creditLimit: form.creditLimit.trim() || null,
    paymentTermsDays: Number(form.paymentTermsDays) || 0,
    priceListId: null,
    ...contactPayload(form),
  }
}
