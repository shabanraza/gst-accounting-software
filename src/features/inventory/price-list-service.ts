import Decimal from 'decimal.js'

export type PriceListRecord = {
  id: string
  companyId: string
  name: string
  createdAt: Date
}

export type PriceListItemRecord = {
  id: string
  priceListId: string
  itemId: string
  rate: string
}

export interface PriceListRepository {
  findByCompanyAndName: (
    companyId: string,
    name: string,
  ) => Promise<PriceListRecord | null>
  create: (priceList: PriceListRecord) => Promise<PriceListRecord>
  listByCompanyId: (companyId: string) => Promise<Array<PriceListRecord>>
}

export interface PriceListItemRepository {
  upsertItemRate: (input: {
    priceListId: string
    itemId: string
    rate: string
  }) => Promise<PriceListItemRecord>
  listByPriceListId: (
    priceListId: string,
  ) => Promise<Array<PriceListItemRecord>>
  findItemRate: (
    priceListId: string,
    itemId: string,
  ) => Promise<PriceListItemRecord | null>
}

export class DuplicatePriceListNameError extends Error {
  constructor(name: string) {
    super(`Price list already exists for this company: ${name}`)
    this.name = 'DuplicatePriceListNameError'
  }
}

export class InvalidPriceListError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPriceListError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export async function createPriceList(
  repository: PriceListRepository,
  input: { companyId: string; name: string },
): Promise<PriceListRecord> {
  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidPriceListError('Price list name is required')
  }

  const existing = await repository.findByCompanyAndName(input.companyId, name)

  if (existing) {
    throw new DuplicatePriceListNameError(name)
  }

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    name,
    createdAt: new Date(),
  })
}

export async function listPriceListsByCompany(
  repository: PriceListRepository,
  companyId: string,
): Promise<Array<PriceListRecord>> {
  return repository.listByCompanyId(companyId)
}

export async function setPriceListItemRate(
  repository: PriceListItemRepository,
  input: { priceListId: string; itemId: string; rate: string },
): Promise<PriceListItemRecord> {
  const rate = new Decimal(input.rate)

  if (rate.isNegative()) {
    throw new InvalidPriceListError('Price list rate must not be negative')
  }

  return repository.upsertItemRate({
    priceListId: input.priceListId,
    itemId: input.itemId,
    rate: rate.toFixed(2),
  })
}

export async function listPriceListItems(
  repository: PriceListItemRepository,
  priceListId: string,
): Promise<Array<PriceListItemRecord>> {
  return repository.listByPriceListId(priceListId)
}

export async function getItemRateFromPriceList(
  repository: PriceListItemRepository,
  priceListId: string | null | undefined,
  itemId: string,
  fallbackRate: string,
): Promise<string> {
  if (!priceListId) {
    return fallbackRate
  }

  const entry = await repository.findItemRate(priceListId, itemId)

  return entry?.rate ?? fallbackRate
}

export async function resolveItemRateForVoucher(
  repository: PriceListItemRepository,
  input: {
    priceListId?: string | null
    itemId: string
    mode: 'sales' | 'purchase'
    saleRate: string
    purchaseRate: string
  },
): Promise<string> {
  const fallbackRate =
    input.mode === 'sales' ? input.saleRate : input.purchaseRate

  return getItemRateFromPriceList(
    repository,
    input.priceListId,
    input.itemId,
    fallbackRate,
  )
}
