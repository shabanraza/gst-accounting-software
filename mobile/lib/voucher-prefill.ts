import {
  createEmptyPurchaseLine,
  type PurchaseBillFormDraft,
} from './purchase-bill-form.ts'
import {
  createEmptySalesLine,
  resolvePlaceOfSupply,
  type SalesInvoiceFormDraft,
  type SupplyRegion,
} from './sales-invoice-form.ts'
import { randomId } from './random-id.ts'

export type SalesDocumentDraftLine = {
  itemId: string
  itemName: string
  hsnCode: string
  gstRate: string
  quantity: string
  unit: string
  rate: string
}

export type SalesDocumentDraft = {
  sourceDocumentId: string
  customerId: string
  documentDate: string
  narration: string
  lines: Array<SalesDocumentDraftLine>
}

export type GrnDraftLine = SalesDocumentDraftLine

export type GrnDraft = {
  sourceGrnId: string
  supplierId: string
  grnDate: string
  narration: string
  godownName: string | null
  lines: Array<GrnDraftLine>
}

function draftLineToSalesLine(
  line: SalesDocumentDraftLine,
  godownName: string,
) {
  return {
    ...createEmptySalesLine(godownName),
    key: randomId(),
    itemId: line.itemId,
    itemName: line.itemName,
    hsnCode: line.hsnCode,
    gstRate: line.gstRate,
    unit: line.unit,
    quantity: line.quantity,
    rate: line.rate,
    godownName,
  }
}

function draftLineToPurchaseLine(line: GrnDraftLine, godownName: string) {
  return {
    ...createEmptyPurchaseLine(godownName),
    key: randomId(),
    itemId: line.itemId,
    itemName: line.itemName,
    hsnCode: line.hsnCode,
    gstRate: line.gstRate,
    unit: line.unit,
    quantity: line.quantity,
    rate: line.rate,
    godownName,
  }
}

function withPartyRegion<T extends { region: SupplyRegion; placeOfSupply: string }>(
  form: T,
  partyStateCode: string | undefined,
  companyStateCode: string,
): T {
  if (!partyStateCode) {
    return form
  }

  const region: SupplyRegion =
    partyStateCode === companyStateCode ? 'local' : 'central'

  return {
    ...form,
    region,
    placeOfSupply: resolvePlaceOfSupply({
      region,
      selectedPlaceOfSupply: '',
      partyStateCode,
      companyStateCode,
    }),
  }
}

export function applySalesDocumentDraft(
  form: SalesInvoiceFormDraft,
  draft: SalesDocumentDraft,
  options: {
    godownName: string
    companyStateCode: string
    partyStateCode?: string
  },
): SalesInvoiceFormDraft {
  const godownName = options.godownName
  const lines = [
    ...draft.lines.map((line) => draftLineToSalesLine(line, godownName)),
    createEmptySalesLine(godownName),
  ]

  return withPartyRegion(
    {
      ...form,
      customerId: draft.customerId,
      invoiceDate: draft.documentDate,
      narration: draft.narration,
      godownName,
      lines,
    },
    options.partyStateCode,
    options.companyStateCode,
  )
}

export function applyGrnDraft(
  form: PurchaseBillFormDraft,
  draft: GrnDraft,
  options: {
    defaultGodownName: string
    companyStateCode: string
    partyStateCode?: string
  },
): PurchaseBillFormDraft {
  const godownName = draft.godownName ?? options.defaultGodownName
  const lines = [
    ...draft.lines.map((line) => draftLineToPurchaseLine(line, godownName)),
    createEmptyPurchaseLine(godownName),
  ]

  return withPartyRegion(
    {
      ...form,
      supplierId: draft.supplierId,
      billDate: draft.grnDate,
      narration: draft.narration,
      godownName,
      lines,
    },
    options.partyStateCode,
    options.companyStateCode,
  )
}