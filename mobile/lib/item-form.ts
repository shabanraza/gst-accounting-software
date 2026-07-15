export type ItemFormDraft = {
  name: string
  alias: string
  itemGroup: string
  hsnCode: string
  gstRate: string
  baseUnit: string
  purchaseRate: string
  saleRate: string
  tracksInventory: boolean
  openingQuantity: string
}

export type ItemRecordLike = {
  id: string
  name: string
  alias: string
  itemGroup: string
  hsnCode: string
  gstRate: string
  baseUnit: string
  purchaseRate: string
  saleRate: string
  tracksInventory: boolean
}

export function createInitialItemForm(): ItemFormDraft {
  return {
    name: '',
    alias: '',
    itemGroup: 'General',
    hsnCode: '',
    gstRate: '5.00',
    baseUnit: 'Meter',
    purchaseRate: '',
    saleRate: '',
    tracksInventory: true,
    openingQuantity: '',
  }
}

export function validateItemForm(form: ItemFormDraft) {
  if (!form.name.trim()) {
    return 'Item name is required.'
  }

  if (!form.hsnCode.trim()) {
    return 'HSN code is required.'
  }

  return null
}

export function itemFormFromRecord(item: ItemRecordLike): ItemFormDraft {
  return {
    name: item.name,
    alias: item.alias,
    itemGroup: item.itemGroup || 'General',
    hsnCode: item.hsnCode,
    gstRate: item.gstRate,
    baseUnit: item.baseUnit,
    purchaseRate: item.purchaseRate,
    saleRate: item.saleRate,
    tracksInventory: item.tracksInventory,
    openingQuantity: '',
  }
}

export function buildUpdateItemInput(
  form: ItemFormDraft,
  companyId: string,
  itemId: string,
) {
  return {
    companyId,
    itemId,
    name: form.name.trim(),
    alias: form.alias.trim(),
    itemGroup: form.itemGroup,
    hsnCode: form.hsnCode.trim(),
    gstRate: form.gstRate,
    baseUnit: form.baseUnit,
    alternateUnit: '',
    conversionFactor: '1',
    mrp: '0.00',
    reorderLevel: '0',
    purchaseRate: form.purchaseRate.trim() || '0.00',
    saleRate: form.saleRate.trim() || '0.00',
    tracksInventory: form.tracksInventory,
  }
}

export function buildCreateItemInput(
  form: ItemFormDraft,
  companyId: string,
) {
  return {
    companyId,
    name: form.name.trim(),
    alias: form.alias.trim(),
    itemGroup: form.itemGroup,
    hsnCode: form.hsnCode.trim(),
    gstRate: form.gstRate,
    baseUnit: form.baseUnit,
    alternateUnit: '',
    conversionFactor: '1',
    mrp: '0.00',
    reorderLevel: '0',
    purchaseRate: form.purchaseRate.trim() || '0.00',
    saleRate: form.saleRate.trim() || '0.00',
    tracksInventory: form.tracksInventory,
    openingQuantity:
      form.tracksInventory && form.openingQuantity.trim()
        ? form.openingQuantity.trim()
        : null,
    openingOccurredOn: new Date().toISOString().slice(0, 10),
  }
}
