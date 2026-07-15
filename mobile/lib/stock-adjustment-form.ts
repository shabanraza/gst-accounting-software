export type StockAdjustmentFormDraft = {
  itemId: string
  quantity: string
  unit: string
  occurredOn: string
}

export function createInitialStockAdjustmentForm(): StockAdjustmentFormDraft {
  return {
    itemId: '',
    quantity: '1',
    unit: '',
    occurredOn: new Date().toISOString().slice(0, 10),
  }
}

export function validateStockAdjustmentForm(form: StockAdjustmentFormDraft) {
  if (!form.itemId.trim()) {
    return 'Select an item.'
  }

  const quantity = Number(form.quantity)
  if (!Number.isFinite(quantity) || quantity === 0) {
    return 'Enter a non-zero adjustment quantity.'
  }

  if (!form.unit.trim()) {
    return 'Unit is required.'
  }

  if (!form.occurredOn.trim()) {
    return 'Date is required.'
  }

  return null
}

export function buildRecordStockMovementInput(
  form: StockAdjustmentFormDraft,
  companyId: string,
  referenceId: string,
) {
  return {
    companyId,
    itemId: form.itemId,
    movementType: 'adjustment' as const,
    quantity: Math.abs(Number(form.quantity)).toFixed(3),
    unit: form.unit,
    referenceType: 'stock_adjustment',
    referenceId,
    occurredOn: form.occurredOn,
  }
}
