import {
  computeLinesSubtotal,
  filledDocumentLines,
  validateDocumentLine,
} from './document-lines'
import { randomId } from './random-id'

export type PurchaseOrderLineDraft = {
  key: string
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
  lines: Array<PurchaseOrderLineDraft>
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

export function createEmptyPurchaseOrderLine(): PurchaseOrderLineDraft {
  return {
    key: randomId(),
    itemId: '',
    itemName: '',
    unit: '',
    quantity: '1',
    rate: '',
    gstRate: '0',
  }
}

export function createInitialPurchaseOrderForm(): PurchaseOrderFormDraft {
  return {
    supplierId: '',
    orderNumber: '',
    orderDate: new Date().toISOString().slice(0, 10),
    narration: '',
    lines: [createEmptyPurchaseOrderLine()],
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
    ...line,
    itemId: item.id,
    itemName: item.name,
    unit: item.baseUnit,
    quantity: line.quantity || '1',
    rate: line.rate || item.purchaseRate,
    gstRate: item.gstRate,
  }
}

export function computePurchaseOrderFormTotal(form: PurchaseOrderFormDraft) {
  return computeLinesSubtotal(filledDocumentLines(form.lines))
}

export function validatePurchaseOrderForm(form: PurchaseOrderFormDraft) {
  if (!form.supplierId.trim()) {
    return 'Select a supplier.'
  }

  if (!form.orderDate.trim()) {
    return 'Order date is required.'
  }

  const lines = filledDocumentLines(form.lines)
  if (lines.length === 0) {
    return 'Add at least one item.'
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineError = validateDocumentLine(lines[index], index + 1)
    if (lineError) {
      return lineError
    }
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
    lines: filledDocumentLines(form.lines).map((line) => ({
      itemId: line.itemId,
      description: line.itemName,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      gstRate: line.gstRate,
    })),
  }
}
