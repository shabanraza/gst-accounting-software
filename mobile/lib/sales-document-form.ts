import {
  computeLinesSubtotal,
  filledDocumentLines,
  validateDocumentLine,
} from './document-lines'
import { randomId } from './random-id'

export type SalesDocumentType = 'quotation' | 'sales_order' | 'delivery_challan'

export const SALES_DOCUMENT_SERIES: Record<SalesDocumentType, string> = {
  quotation: 'QT',
  sales_order: 'SO',
  delivery_challan: 'DC',
}

export type SalesDocumentLineDraft = {
  key: string
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
  lines: Array<SalesDocumentLineDraft>
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

export function createEmptySalesDocumentLine(): SalesDocumentLineDraft {
  return {
    key: randomId(),
    itemId: '',
    itemName: '',
    unit: '',
    quantity: '1',
    rate: '',
  }
}

export function createInitialSalesDocumentForm(): SalesDocumentFormDraft {
  return {
    documentType: 'quotation',
    documentNumber: '',
    documentDate: new Date().toISOString().slice(0, 10),
    customerId: '',
    lines: [createEmptySalesDocumentLine()],
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
    ...line,
    itemId: item.id,
    itemName: item.name,
    unit: item.baseUnit,
    quantity: line.quantity || '1',
    rate: line.rate || item.saleRate,
  }
}

export function computeSalesDocumentFormTotal(form: SalesDocumentFormDraft) {
  return computeLinesSubtotal(filledDocumentLines(form.lines))
}

export function validateSalesDocumentForm(form: SalesDocumentFormDraft) {
  if (!form.customerId.trim()) {
    return 'Select a customer.'
  }

  if (!form.documentDate.trim()) {
    return 'Document date is required.'
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

export function buildCreateSalesDocumentInput(
  form: SalesDocumentFormDraft,
  companyId: string,
  documentNumber: string,
) {
  return {
    companyId,
    documentType: form.documentType,
    documentNumber,
    documentDate: form.documentDate,
    customerId: form.customerId,
    lines: filledDocumentLines(form.lines).map((line) => ({
      itemId: line.itemId,
      description: line.itemName,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
    })),
  }
}
