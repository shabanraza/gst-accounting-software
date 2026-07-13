import {
  resolvePartyBillingAddress,
  resolvePartyShippingAddress,
} from '#/features/parties/party-address.ts'

export type PartyType = 'customer' | 'supplier' | 'both'

export type PartyContactFields = {
  pan?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
  contactPhone?: string
  contactEmail?: string
  billingAddress?: string
  shippingAddress?: string
}

export type CreatePartyInput = PartyContactFields & {
  companyId: string
  name: string
  partyType: PartyType
  gstin: string | null
  stateCode: string
  creditLimit: string | null
  paymentTermsDays: number
  priceListId?: string | null
  receivableAccountId: string | null
  payableAccountId: string | null
}

export type UpdatePartyInput = PartyContactFields & {
  id: string
  companyId: string
  name: string
  partyType: PartyType
  gstin: string | null
  stateCode: string
  creditLimit: string | null
  paymentTermsDays: number
  priceListId?: string | null
}

export type PartyRecord = CreatePartyInput & {
  id: string
  createdAt: Date
}

export interface PartyRepository {
  findById: (id: string) => Promise<PartyRecord | null>
  findByCompanyAndName: (
    companyId: string,
    name: string,
  ) => Promise<PartyRecord | null>
  create: (party: PartyRecord) => Promise<PartyRecord>
  update: (party: PartyRecord) => Promise<PartyRecord>
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

export class PartyNotFoundError extends Error {
  constructor(id: string) {
    super(`Party not found: ${id}`)
    this.name = 'PartyNotFoundError'
  }
}

function normalizeGstin(gstin: string | null): string | null {
  const normalized = gstin?.trim().toUpperCase() ?? null

  return normalized && normalized.length > 0 ? normalized : null
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function normalizePartyFields(input: PartyContactFields): PartyContactFields {
  return {
    pan: input.pan?.trim().toUpperCase() ?? '',
    addressLine1: input.addressLine1?.trim() ?? '',
    addressLine2: input.addressLine2?.trim() ?? '',
    city: input.city?.trim() ?? '',
    pincode: input.pincode?.trim() ?? '',
    contactPhone: input.contactPhone?.trim() ?? '',
    contactEmail: input.contactEmail?.trim() ?? '',
    billingAddress: resolvePartyBillingAddress(input),
    shippingAddress: resolvePartyShippingAddress(input),
  }
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

  const contactFields = normalizePartyFields(input)

  return repository.create({
    ...input,
    ...contactFields,
    name,
    gstin: normalizeGstin(input.gstin),
    priceListId: input.priceListId ?? null,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}

export async function updateParty(
  repository: PartyRepository,
  input: UpdatePartyInput,
): Promise<PartyRecord> {
  const existing = await repository.findById(input.id)

  if (!existing || existing.companyId !== input.companyId) {
    throw new PartyNotFoundError(input.id)
  }

  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidPartyMappingError('Party name is required')
  }

  const duplicate = await repository.findByCompanyAndName(input.companyId, name)

  if (duplicate && duplicate.id !== input.id) {
    throw new DuplicatePartyNameError(name)
  }

  const contactFields = normalizePartyFields(input)

  return repository.update({
    ...existing,
    ...input,
    ...contactFields,
    name,
    gstin: normalizeGstin(input.gstin),
    priceListId: input.priceListId ?? null,
    receivableAccountId: existing.receivableAccountId,
    payableAccountId: existing.payableAccountId,
  })
}

export async function listPartiesByCompany(
  repository: PartyRepository,
  companyId: string,
): Promise<Array<PartyRecord>> {
  return repository.listByCompanyId(companyId)
}
