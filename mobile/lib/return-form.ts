import { isValidStateCode } from './sales-invoice-form.ts'

export type ReturnMode = 'sales' | 'purchase'

export type ReturnFormDraft = {
  mode: ReturnMode
  documentId: string
  quantity: string
  returnDate: string
}

export type ReturnDocumentLineLike = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
}

export type ReturnSalesDocumentLike = {
  id: string
  customerId: string
  lines: Array<ReturnDocumentLineLike>
}

export type ReturnPurchaseDocumentLike = {
  id: string
  supplierId: string
  lines: Array<ReturnDocumentLineLike>
}

export type ReturnPartyLike = {
  id: string
  stateCode: string
}

export function createInitialReturnForm(): ReturnFormDraft {
  return {
    mode: 'sales',
    documentId: '',
    quantity: '1',
    returnDate: new Date().toISOString().slice(0, 10),
  }
}

export function validateReturnForm(form: ReturnFormDraft) {
  if (!form.documentId.trim()) {
    return form.mode === 'sales'
      ? 'Select a sales invoice.'
      : 'Select a purchase bill.'
  }

  if (!form.returnDate.trim()) {
    return 'Return date is required.'
  }

  const quantity = Number(form.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 'Enter a positive return quantity.'
  }

  return null
}

export function validateReturnLedgerMappings(input: {
  mode: ReturnMode
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  if (input.mode === 'sales') {
    const required = ['sales', 'output_gst', 'customer_receivable'] as const
    for (const key of required) {
      if (!input.ledgerBySystemKey[key]) {
        return 'Sales ledger mappings are missing for this company.'
      }
    }
    return null
  }

  const required = ['purchase', 'input_gst', 'supplier_payable'] as const
  for (const key of required) {
    if (!input.ledgerBySystemKey[key]) {
      return 'Purchase ledger mappings are missing for this company.'
    }
  }
  return null
}

export function resolvePartyStateCode(
  party: ReturnPartyLike | undefined,
  companyStateCode: string,
) {
  if (party && isValidStateCode(party.stateCode)) {
    return party.stateCode
  }
  return companyStateCode
}

export function buildSalesReturnInput(input: {
  form: ReturnFormDraft
  companyId: string
  companyStateCode: string
  customerId: string
  customerStateCode: string
  salesInvoiceId: string
  line: ReturnDocumentLineLike
  quantity: string
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  return {
    companyId: input.companyId,
    companyStateCode: input.companyStateCode,
    customerId: input.customerId,
    customerStateCode: input.customerStateCode,
    salesInvoiceId: input.salesInvoiceId,
    returnDate: input.form.returnDate,
    salesAccountId: input.ledgerBySystemKey.sales!,
    outputGstAccountId: input.ledgerBySystemKey.output_gst!,
    receivableAccountId: input.ledgerBySystemKey.customer_receivable!,
    lines: [
      {
        itemId: input.line.itemId,
        description: input.line.description,
        quantity: input.quantity,
        unit: input.line.unit,
        rate: input.line.rate,
        gstRate: input.line.gstRate,
      },
    ],
  }
}

export function buildPurchaseReturnInput(input: {
  form: ReturnFormDraft
  companyId: string
  companyStateCode: string
  supplierId: string
  supplierStateCode: string
  purchaseBillId: string
  line: ReturnDocumentLineLike
  quantity: string
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  return {
    companyId: input.companyId,
    companyStateCode: input.companyStateCode,
    supplierId: input.supplierId,
    supplierStateCode: input.supplierStateCode,
    purchaseBillId: input.purchaseBillId,
    returnDate: input.form.returnDate,
    purchaseAccountId: input.ledgerBySystemKey.purchase!,
    inputGstAccountId: input.ledgerBySystemKey.input_gst!,
    payableAccountId: input.ledgerBySystemKey.supplier_payable!,
    lines: [
      {
        itemId: input.line.itemId,
        description: input.line.description,
        quantity: input.quantity,
        unit: input.line.unit,
        rate: input.line.rate,
        gstRate: input.line.gstRate,
      },
    ],
  }
}
