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
