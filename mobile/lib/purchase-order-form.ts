export type PurchaseOrderLineDraft = {
  itemId: string
  itemName: string
  unit: string
  quantity: string
  rate: string
  gstRate: string
}

export type PurchaseOrderFormDraft = {
  supplierId: string
  orderNumber: string
  orderDate: string
  narration: string
  line: PurchaseOrderLineDraft
}

export type PurchaseOrderSupplierLike = {
  id: string
  name: string
  partyType: 'customer' | 'supplier' | 'both'
}

export type PurchaseOrderItemLike = {
  id: string
  name: string
  baseUnit: string
  purchaseRate: string
  gstRate: string
}

export function createInitialPurchaseOrderForm(): PurchaseOrderFormDraft {
  return {
    supplierId: '',
    orderNumber: '',
    orderDate: new Date().toISOString().slice(0, 10),
    narration: '',
    line: {
      itemId: '',
      itemName: '',
      unit: '',
      quantity: '1',
      rate: '',
      gstRate: '0',
    },
  }
}

export function filterSupplierParties(
  parties: Array<PurchaseOrderSupplierLike>,
) {
  return parties.filter(
    (party) => party.partyType === 'supplier' || party.partyType === 'both',
  )
}

export function applyItemToPurchaseOrderLine(
  line: PurchaseOrderLineDraft,
  item: PurchaseOrderItemLike,
): PurchaseOrderLineDraft {
  return {
    itemId: item.id,
    itemName: item.name,
    unit: item.baseUnit,
    quantity: line.quantity || '1',
    rate: line.rate || item.purchaseRate,
    gstRate: item.gstRate,
  }
}

export function validatePurchaseOrderForm(form: PurchaseOrderFormDraft) {
  if (!form.supplierId.trim()) {
    return 'Select a supplier.'
  }

  if (!form.orderDate.trim()) {
    return 'Order date is required.'
  }

  if (!form.line.itemId.trim()) {
    return 'Select an item.'
  }

  const quantity = Number(form.line.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 'Enter a positive quantity.'
  }

  const rate = Number(form.line.rate)
  if (!Number.isFinite(rate) || rate < 0) {
    return 'Enter a valid rate.'
  }

  return null
}

export function buildCreatePurchaseOrderInput(
  form: PurchaseOrderFormDraft,
  companyId: string,
  orderNumber: string,
) {
  return {
    companyId,
    supplierId: form.supplierId,
    orderNumber,
    orderDate: form.orderDate,
    narration: form.narration.trim() || undefined,
    lines: [
      {
        itemId: form.line.itemId,
        description: form.line.itemName,
        quantity: form.line.quantity,
        unit: form.line.unit,
        rate: form.line.rate,
        gstRate: form.line.gstRate,
      },
    ],
  }
}
