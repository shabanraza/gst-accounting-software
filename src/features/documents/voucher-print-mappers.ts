import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type {
  VoucherPrintCompanyInfo,
  VoucherPrintPartyInfo,
} from '#/features/documents/voucher-print-types.ts'

export function toPrintCompany(
  company: CompanyRecord,
): VoucherPrintCompanyInfo {
  return {
    legalName: company.legalName,
    tradeName: company.tradeName,
    gstin: company.gstin,
    stateCode: company.stateCode,
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2,
    city: company.city,
    pincode: company.pincode,
    pan: company.pan,
    contactPhone: company.contactPhone,
    contactEmail: company.contactEmail,
    bankName: company.bankName,
    bankAccountNumber: company.bankAccountNumber,
    bankIfsc: company.bankIfsc,
    authorizedSignatory: company.authorizedSignatory,
    logoUrl: company.logoUrl,
    invoiceTerms: company.invoiceTerms,
  }
}

export function toPrintParty(party: PartyRecord): VoucherPrintPartyInfo {
  return {
    name: party.name,
    gstin: party.gstin,
    stateCode: party.stateCode,
    pan: party.pan,
    billingAddress: party.billingAddress,
    shippingAddress: party.shippingAddress,
    contactPhone: party.contactPhone,
    contactEmail: party.contactEmail,
  }
}
