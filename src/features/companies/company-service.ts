export type BusinessType =
  | 'trading'
  | 'wholesale'
  | 'retail'
  | 'manufacturing_light'
  | 'services'
  | 'distribution'
  | 'custom'

export type CompanyProfile = {
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
}

export const emptyCompanyProfile: CompanyProfile = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  pan: '',
  contactPhone: '',
  contactEmail: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  authorizedSignatory: '',
  logoUrl: '',
}

export type CreateCompanyInput = {
  accountId: string
  legalName: string
  tradeName: string
  gstin: string | null
  stateCode: string
  financialYearStart: string
  businessType: BusinessType
} & Partial<CompanyProfile>

export type CompanyRecord = Omit<CreateCompanyInput, keyof CompanyProfile> &
  CompanyProfile & {
    id: string
    createdAt: Date
  }

export interface CompanyRepository {
  findByAccountAndGstin: (
    accountId: string,
    gstin: string,
  ) => Promise<CompanyRecord | null>
  create: (company: CompanyRecord) => Promise<CompanyRecord>
  listByAccountId: (accountId: string) => Promise<Array<CompanyRecord>>
  listByIds: (ids: Array<string>) => Promise<Array<CompanyRecord>>
  updateProfile: (
    id: string,
    profile: CompanyProfile,
  ) => Promise<CompanyRecord | null>
}

export class DuplicateCompanyGstinError extends Error {
  constructor(gstin: string) {
    super(`Company GSTIN already exists for this account: ${gstin}`)
    this.name = 'DuplicateCompanyGstinError'
  }
}

function normalizeGstin(gstin: string | null): string | null {
  const normalized = gstin?.trim().toUpperCase() ?? null

  return normalized && normalized.length > 0 ? normalized : null
}

export async function createCompany(
  repository: CompanyRepository,
  input: CreateCompanyInput,
): Promise<CompanyRecord> {
  const gstin = normalizeGstin(input.gstin)

  if (gstin) {
    const existingCompany = await repository.findByAccountAndGstin(
      input.accountId,
      gstin,
    )

    if (existingCompany) {
      throw new DuplicateCompanyGstinError(gstin)
    }
  }

  return repository.create({
    ...emptyCompanyProfile,
    ...input,
    gstin,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}

export async function updateCompanyProfile(
  repository: CompanyRepository,
  id: string,
  profile: CompanyProfile,
): Promise<CompanyRecord | null> {
  return repository.updateProfile(id, profile)
}

export async function listCompaniesByAccount(
  repository: CompanyRepository,
  accountId: string,
): Promise<Array<CompanyRecord>> {
  return repository.listByAccountId(accountId)
}

export async function listCompaniesByIds(
  repository: CompanyRepository,
  ids: Array<string>,
): Promise<Array<CompanyRecord>> {
  if (ids.length === 0) return []
  return repository.listByIds(ids)
}
