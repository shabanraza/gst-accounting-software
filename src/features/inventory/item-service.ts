export type CreateItemInput = {
  companyId: string
  name: string
  alias?: string
  itemGroup?: string
  hsnCode: string
  gstRate: string
  baseUnit: string
  alternateUnit?: string
  conversionFactor?: string
  mrp?: string
  reorderLevel?: string
  purchaseRate: string
  saleRate: string
  tracksInventory: boolean
}

export type UpdateItemInput = CreateItemInput & {
  itemId: string
}

export type ItemRecord = CreateItemInput & {
  id: string
  alias: string
  itemGroup: string
  alternateUnit: string
  conversionFactor: string
  mrp: string
  reorderLevel: string
  createdAt: Date
}

export interface ItemRepository {
  create: (item: ItemRecord) => Promise<ItemRecord>
  update: (item: ItemRecord) => Promise<ItemRecord>
  findById: (id: string) => Promise<ItemRecord | null>
  listByCompanyId: (companyId: string) => Promise<Array<ItemRecord>>
}

export class ItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item not found: ${id}`)
    this.name = 'ItemNotFoundError'
  }
}

export class InvalidItemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidItemError'
  }
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export async function createItem(
  repository: ItemRepository,
  input: CreateItemInput,
): Promise<ItemRecord> {
  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidItemError('Item name is required')
  }

  if (!input.hsnCode.trim()) {
    throw new InvalidItemError('HSN/SAC code is required')
  }

  return repository.create({
    ...input,
    name,
    alias: input.alias?.trim() ?? '',
    itemGroup: input.itemGroup?.trim() ?? '',
    hsnCode: input.hsnCode.trim(),
    gstRate: input.gstRate,
    alternateUnit: input.alternateUnit?.trim() ?? '',
    conversionFactor: input.conversionFactor?.trim() || '1',
    mrp: input.mrp?.trim() || '0.00',
    reorderLevel: input.reorderLevel?.trim() || '0',
    purchaseRate: input.purchaseRate,
    saleRate: input.saleRate,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}

export async function updateItem(
  repository: ItemRepository,
  input: UpdateItemInput,
): Promise<ItemRecord> {
  const existing = await repository.findById(input.itemId)

  if (!existing || existing.companyId !== input.companyId) {
    throw new ItemNotFoundError(input.itemId)
  }

  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidItemError('Item name is required')
  }

  if (!input.hsnCode.trim()) {
    throw new InvalidItemError('HSN/SAC code is required')
  }

  return repository.update({
    ...existing,
    name,
    alias: input.alias?.trim() ?? '',
    itemGroup: input.itemGroup?.trim() ?? '',
    hsnCode: input.hsnCode.trim(),
    gstRate: input.gstRate,
    baseUnit: input.baseUnit,
    alternateUnit: input.alternateUnit?.trim() ?? '',
    conversionFactor: input.conversionFactor?.trim() || '1',
    mrp: input.mrp?.trim() || '0.00',
    reorderLevel: input.reorderLevel?.trim() || '0',
    purchaseRate: input.purchaseRate,
    saleRate: input.saleRate,
    tracksInventory: input.tracksInventory,
  })
}

export async function listItemsByCompany(
  repository: ItemRepository,
  companyId: string,
): Promise<Array<ItemRecord>> {
  return repository.listByCompanyId(companyId)
}
