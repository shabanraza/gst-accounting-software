export type GrnFormDraft = {
  purchaseOrderId: string
  grnNumber: string
  grnDate: string
  godownName: string
  narration: string
}

export type OpenPurchaseOrderLike = {
  id: string
  orderNumber: string
  status: string
  lines?: Array<{
    id: string
    description: string
    quantity: string
    unit: string
    rate: string
    gstRate: string
    lineTotal: string
  }>
}

export function createInitialGrnForm(godownName = ''): GrnFormDraft {
  return {
    purchaseOrderId: '',
    grnNumber: '',
    grnDate: new Date().toISOString().slice(0, 10),
    godownName,
    narration: '',
  }
}

export function filterOpenPurchaseOrders(
  orders: Array<OpenPurchaseOrderLike>,
) {
  return orders.filter((order) => order.status === 'open')
}

export function validateGrnForm(form: GrnFormDraft) {
  if (!form.purchaseOrderId.trim()) {
    return 'Select a purchase order.'
  }

  if (!form.grnDate.trim()) {
    return 'GRN date is required.'
  }

  return null
}

export function buildReceiveFromPurchaseOrderInput(
  form: GrnFormDraft,
  companyId: string,
  grnNumber: string,
) {
  return {
    companyId,
    purchaseOrderId: form.purchaseOrderId,
    grnNumber,
    grnDate: form.grnDate,
    godownName: form.godownName.trim() || undefined,
    narration: form.narration.trim() || undefined,
  }
}
