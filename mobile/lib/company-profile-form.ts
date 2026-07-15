export type CompanyProfileFormDraft = {
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  pan: string
  contactPhone: string
  contactEmail: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  authorizedSignatory: string
  logoUrl: string
  invoiceTerms: string
}

export type CompanyProfileSource = Partial<CompanyProfileFormDraft>

export function createInitialCompanyProfileForm(
  source: CompanyProfileSource = {},
): CompanyProfileFormDraft {
  return {
    addressLine1: source.addressLine1 ?? '',
    addressLine2: source.addressLine2 ?? '',
    city: source.city ?? '',
    pincode: source.pincode ?? '',
    pan: source.pan ?? '',
    contactPhone: source.contactPhone ?? '',
    contactEmail: source.contactEmail ?? '',
    bankName: source.bankName ?? '',
    bankAccountNumber: source.bankAccountNumber ?? '',
    bankIfsc: source.bankIfsc ?? '',
    authorizedSignatory: source.authorizedSignatory ?? '',
    logoUrl: source.logoUrl ?? '',
    invoiceTerms: source.invoiceTerms ?? '',
  }
}

export function buildUpdateCompanyProfileInput(
  form: CompanyProfileFormDraft,
  companyId: string,
) {
  return {
    companyId,
    ...form,
  }
}
