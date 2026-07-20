import Decimal from 'decimal.js'

import {
  formatPartyStructuredAddress,
  resolvePartyBillingAddress,
  resolvePartyShippingAddress,
} from '#/features/parties/party-address.ts'

import type { PartyRecord } from '#/features/parties/party-service.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type InvoicePartySnapshot = {
  partyNameSnapshot: string
  partyGstinSnapshot: string | null
  partyPanSnapshot: string
  partyBillingAddressSnapshot: string
  partyShippingAddressSnapshot: string
  partyStateCodeSnapshot: string
  partyPhoneSnapshot: string
  partyEmailSnapshot: string
}

export class TaxInvoiceAddressRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaxInvoiceAddressRequiredError'
  }
}

function hasStructuredAddress(fields: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  pincode?: string | null
}) {
  return Boolean(
    formatPartyStructuredAddress({
      addressLine1: fields.addressLine1 ?? undefined,
      addressLine2: fields.addressLine2 ?? undefined,
      city: fields.city ?? undefined,
      pincode: fields.pincode ?? undefined,
    }).trim(),
  )
}

export function resolveCompanyPrintAddress(company: {
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
}) {
  return formatPartyStructuredAddress(company)
}

export function assertTaxInvoiceCompanyAddress(
  company: {
    gstin?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    pincode?: string | null
  },
) {
  if (!company.gstin?.trim()) return

  if (!hasStructuredAddress(company)) {
    throw new TaxInvoiceAddressRequiredError(
      'Company billing address is required on tax invoices. Update company profile with address before posting.',
    )
  }
}

export function assertTaxInvoicePartyAddress(input: {
  partyName: string
  partyGstin: string | null
  billingAddress: string
  invoiceTotal: string
}) {
  const billingAddress = input.billingAddress.trim()
  const gstin = input.partyGstin?.trim() || null
  const total = new Decimal(input.invoiceTotal || '0')

  if (gstin && !billingAddress) {
    throw new TaxInvoiceAddressRequiredError(
      `${input.partyName} is registered (GSTIN) but has no billing address. Add address in party master before posting.`,
    )
  }

  if (!gstin && total.gt(50000) && !billingAddress) {
    throw new TaxInvoiceAddressRequiredError(
      `Billing address is required for unregistered ${input.partyName} when invoice value exceeds ₹50,000.`,
    )
  }
}

export function buildInvoicePartySnapshot(
  party: PartyRecord,
): InvoicePartySnapshot {
  return {
    partyNameSnapshot: party.name,
    partyGstinSnapshot: party.gstin,
    partyPanSnapshot: party.pan?.trim() || '',
    partyBillingAddressSnapshot: resolvePartyBillingAddress(party),
    partyShippingAddressSnapshot: resolvePartyShippingAddress(party),
    partyStateCodeSnapshot: party.stateCode,
    partyPhoneSnapshot: party.contactPhone?.trim() || '',
    partyEmailSnapshot: party.contactEmail?.trim() || '',
  }
}

export function partySnapshotHasAddress(snapshot: InvoicePartySnapshot) {
  return Boolean(snapshot.partyBillingAddressSnapshot.trim())
}
