export type PartyType = 'customer' | 'supplier' | 'both'

export type CreatePartyInput = {
  companyId: string
  name: string
  partyType: PartyType
  gstin: string | null
  pan?: string
  stateCode: string
  billingAddress?: string
  shippingAddress?: string
  creditLimit: string | null
  paymentTermsDays: number
  priceListId?: string | null
  receivableAccountId: string | null
  payableAccountId: string | null
}

export type PartyRecord = CreatePartyInput & {
  id: string
  createdAt: Date
}

export interface PartyRepository {
  findByCompanyAndName: (
    companyId: string,
    name: string,
  ) => Promise<PartyRecord | null>
  create: (party: PartyRecord) => Promise<PartyRecord>
  listByCompanyId: (companyId: string) => Promise<Array<PartyRecord>>
}

export class DuplicatePartyNameError extends Error {
  constructor(name: string) {
    super(`Party already exists for this company: ${name}`)
    this.name = 'DuplicatePartyNameError'
  }
}

export class InvalidPartyMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPartyMappingError'
  }
}

function normalizeGstin(gstin: string | null): string | null {
  const normalized = gstin?.trim().toUpperCase() ?? null

  return normalized && normalized.length > 0 ? normalized : null
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function assertPartyMappings(input: CreatePartyInput) {
  if (
    (input.partyType === 'customer' || input.partyType === 'both') &&
    !input.receivableAccountId
  ) {
    throw new InvalidPartyMappingError(
      'Customer parties require a receivable account mapping',
    )
  }

  if (
    (input.partyType === 'supplier' || input.partyType === 'both') &&
    !input.payableAccountId
  ) {
    throw new InvalidPartyMappingError(
      'Supplier parties require a payable account mapping',
    )
  }
}

export async function createParty(
  repository: PartyRepository,
  input: CreatePartyInput,
): Promise<PartyRecord> {
  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidPartyMappingError('Party name is required')
  }

  assertPartyMappings(input)

  const existing = await repository.findByCompanyAndName(input.companyId, name)

  if (existing) {
    throw new DuplicatePartyNameError(name)
  }

  return repository.create({
    ...input,
    name,
    gstin: normalizeGstin(input.gstin),
    pan: input.pan?.trim().toUpperCase() ?? '',
    billingAddress: input.billingAddress ?? '',
    shippingAddress: input.shippingAddress ?? '',
    priceListId: input.priceListId ?? null,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}

export async function listPartiesByCompany(
  repository: PartyRepository,
  companyId: string,
): Promise<Array<PartyRecord>> {
  return repository.listByCompanyId(companyId)
}
