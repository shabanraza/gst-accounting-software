import {
  generateInStoreEan13,
  normalizeBarcode,
} from '#/features/inventory/barcode.ts'
import { DomainError } from '#/lib/domain-error.ts'

export type CreateItemInput = {
  companyId: string
  name: string
  alias?: string
  /** EAN-13 (a 12-digit UPC-A is stored as EAN-13). Blank for none. */
  barcode?: string
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

export class ItemNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Item not found: ${id}`)
    this.name = 'ItemNotFoundError'
  }
}

export class InvalidItemError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidItemError'
  }
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

async function resolveBarcode(
  repository: ItemRepository,
  companyId: string,
  raw: string | undefined,
  itemId?: string,
) {
  const barcode = normalizeBarcode(raw)
  if (barcode === null) {
    throw new InvalidItemError(
      'Barcode must be a 13-digit EAN or 12-digit UPC with a valid check digit',
    )
  }
  if (!barcode) return ''

  const items = await repository.listByCompanyId(companyId)
  const owner = items.find(
    (item) => item.barcode === barcode && item.id !== itemId,
  )
  if (owner) {
    throw new InvalidItemError(
      `Barcode ${barcode} is already used by ${owner.name}`,
    )
  }
  return barcode
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

  const barcode = await resolveBarcode(
    repository,
    input.companyId,
    input.barcode,
  )

  return repository.create({
    ...input,
    name,
    alias: input.alias?.trim() ?? '',
    barcode,
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

  const barcode =
    input.barcode === undefined
      ? (existing.barcode ?? '')
      : await resolveBarcode(
          repository,
          input.companyId,
          input.barcode,
          existing.id,
        )

  return repository.update({
    ...existing,
    name,
    alias: input.alias?.trim() ?? '',
    barcode,
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

/**
 * Gives each listed item without a barcode an in-store EAN-13 so its label can
 * be printed and scanned at billing. Returns the listed items.
 */
export async function assignMissingBarcodes(
  repository: ItemRepository,
  input: { companyId: string; itemIds: Array<string> },
): Promise<Array<ItemRecord>> {
  const companyItems = await repository.listByCompanyId(input.companyId)
  const byId = new Map(companyItems.map((item) => [item.id, item]))
  const taken = new Set(
    companyItems.map((item) => item.barcode ?? '').filter(Boolean),
  )

  const result: Array<ItemRecord> = []
  for (const itemId of input.itemIds) {
    const item = byId.get(itemId)
    if (!item) throw new ItemNotFoundError(itemId)
    if (item.barcode) {
      result.push(item)
      continue
    }
    const barcode = generateInStoreEan13(taken)
    taken.add(barcode)
    result.push(await repository.update({ ...item, barcode }))
  }
  return result
}
