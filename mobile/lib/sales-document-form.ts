export type SalesDocumentType = 'quotation' | 'sales_order' | 'delivery_challan'

export type SalesDocumentLineDraft = {
  itemId: string
  itemName: string
  unit: string
  quantity: string
  rate: string
}

export type SalesDocumentFormDraft = {
  documentType: SalesDocumentType
  documentNumber: string
  documentDate: string
  customerId: string
  line: SalesDocumentLineDraft
}

export type SalesDocumentCustomerLike = {
  id: string
  name: string
  partyType: 'customer' | 'supplier' | 'both'
}

export type SalesDocumentItemLike = {
  id: string
  name: string
  baseUnit: string
  saleRate: string
}

export function createInitialSalesDocumentForm(): SalesDocumentFormDraft {
  return {
    documentType: 'quotation',
    documentNumber: '',
    documentDate: new Date().toISOString().slice(0, 10),
    customerId: '',
    line: {
      itemId: '',
      itemName: '',
      unit: '',
      quantity: '1',
      rate: '',
    },
  }
}

export function filterCustomerParties(
  parties: Array<SalesDocumentCustomerLike>,
) {
  return parties.filter(
    (party) => party.partyType === 'customer' || party.partyType === 'both',
  )
}

export function applyItemToSalesDocumentLine(
  line: SalesDocumentLineDraft,
  item: SalesDocumentItemLike,
): SalesDocumentLineDraft {
  return {
    itemId: item.id,
    itemName: item.name,
    unit: item.baseUnit,
    quantity: line.quantity || '1',
    rate: line.rate || item.saleRate,
  }
}

export function validateSalesDocumentForm(form: SalesDocumentFormDraft) {
  if (!form.customerId.trim()) {
    return 'Select a customer.'
  }

  if (!form.documentDate.trim()) {
    return 'Document date is required.'
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

export function buildCreateSalesDocumentInput(
  form: SalesDocumentFormDraft,
  companyId: string,
) {
  return {
    companyId,
    documentType: form.documentType,
    documentNumber:
      form.documentNumber.trim() ||
      `${form.documentType.toUpperCase()}-${Date.now()}`,
    documentDate: form.documentDate,
    customerId: form.customerId,
    lines: [
      {
        itemId: form.line.itemId,
        description: form.line.itemName,
        quantity: form.line.quantity,
        unit: form.line.unit,
        rate: form.line.rate,
      },
    ],
  }
}
