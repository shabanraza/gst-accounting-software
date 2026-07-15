export type SupplyRegion = 'local' | 'central'
export type TaxMode = 'exclusive' | 'inclusive'
export type PaymentMode = 'credit' | 'cash'

export type SalesInvoiceLineDraft = {
  key: string
  itemId: string
  itemName: string
  gstRate: string
  unit: string
  quantity: string
  rate: string
  discountPercent: string
  godownName: string
}

export type SalesPartyLike = {
  id: string
  name: string
  partyType: 'customer' | 'supplier' | 'both'
  stateCode: string
}

export type SalesItemLike = {
  id: string
  name: string
  gstRate: string
  baseUnit: string
  saleRate: string
}

export type SalesInvoiceFormDraft = {
  customerId: string
  invoiceDate: string
  paymentMode: PaymentMode
  taxMode: TaxMode
  region: SupplyRegion
  godownName: string
  narration: string
  lines: Array<SalesInvoiceLineDraft>
}

export type WorkspaceCompanyLike = {
  id: string
  gstin: string | null
  stateCode: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
}

export type PostSalesInvoiceContext = {
  company: WorkspaceCompanyLike
  ledgerBySystemKey: Partial<Record<string, string>>
  customer: SalesPartyLike
  invoiceNumber: string
  activeFinancialYearId: string
}

const REQUIRED_LEDGER_KEYS = [
  'sales',
  'output_gst',
  'customer_receivable',
  'cash',
] as const

function money(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toFixed(2)
}

export function isValidStateCode(code: string | null | undefined) {
  return /^[0-9]{2}$/.test((code ?? '').trim())
}

export function resolvePlaceOfSupply(input: {
  region: SupplyRegion
  partyStateCode: string
  companyStateCode: string
}) {
  if (input.region === 'local') {
    return input.companyStateCode
  }

  return input.partyStateCode || input.companyStateCode
}

export function partyStateForRegion(
  region: SupplyRegion,
  partyStateCode: string,
  companyStateCode: string,
) {
  if (region === 'local') {
    return companyStateCode
  }

  return partyStateCode === companyStateCode ? '24' : partyStateCode
}

export function filterCustomerParties(parties: Array<SalesPartyLike>) {
  return parties.filter(
    (party) => party.partyType === 'customer' || party.partyType === 'both',
  )
}

import { randomId } from './random-id.ts'

export function createEmptySalesLine(godownName: string): SalesInvoiceLineDraft {
  return {
    key: randomId(),
    itemId: '',
    itemName: '',
    gstRate: '0',
    unit: '',
    quantity: '1',
    rate: '0.00',
    discountPercent: '0',
    godownName,
  }
}

export function createInitialSalesInvoiceForm(
  godownName: string,
): SalesInvoiceFormDraft {
  return {
    customerId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'credit',
    taxMode: 'exclusive',
    region: 'local',
    godownName,
    narration: '',
    lines: [createEmptySalesLine(godownName)],
  }
}

export function applyItemToLine(
  line: SalesInvoiceLineDraft,
  item: SalesItemLike,
  godownName: string,
): SalesInvoiceLineDraft {
  return {
    ...line,
    itemId: item.id,
    itemName: item.name,
    gstRate: item.gstRate,
    unit: item.baseUnit,
    rate: item.saleRate,
    godownName: line.godownName || godownName,
  }
}

export function computeLinePreview(
  line: SalesInvoiceLineDraft,
  region: SupplyRegion,
  partyStateCode: string,
  companyStateCode: string,
  taxMode: TaxMode = 'exclusive',
) {
  const qty = money(line.quantity)
  const rate = money(line.rate)
  const discountPercent = money(line.discountPercent)
  const gstRate = money(line.gstRate || '0')
  const grossAmount = qty * rate
  const discountAmount = grossAmount * (discountPercent / 100)
  let taxableAmount = Math.max(grossAmount - discountAmount, 0)

  if (taxMode === 'inclusive' && gstRate > 0) {
    taxableAmount = (taxableAmount * 100) / (gstRate + 100)
  }

  const gstPartyState = partyStateForRegion(
    region,
    partyStateCode,
    companyStateCode,
  )
  const totalGstAmount = taxableAmount * (gstRate / 100)
  const isIntraState = companyStateCode === gstPartyState
  const cgstAmount = isIntraState ? totalGstAmount / 2 : 0
  const sgstAmount = isIntraState ? totalGstAmount / 2 : 0
  const igstAmount = isIntraState ? 0 : totalGstAmount
  const lineTotal =
    taxMode === 'inclusive'
      ? Math.max(grossAmount - discountAmount, 0)
      : taxableAmount + totalGstAmount

  return {
    taxableAmount: formatMoney(taxableAmount),
    totalGstAmount: formatMoney(totalGstAmount),
    cgstAmount: formatMoney(cgstAmount),
    sgstAmount: formatMoney(sgstAmount),
    igstAmount: formatMoney(igstAmount),
    lineTotal: formatMoney(lineTotal),
  }
}

export function computeFormTotals(
  form: SalesInvoiceFormDraft,
  partyStateCode: string,
  companyStateCode: string,
) {
  const filledLines = form.lines.filter((line) => line.itemId)
  const lineTotals = filledLines.map((line) =>
    computeLinePreview(
      line,
      form.region,
      partyStateCode,
      companyStateCode,
      form.taxMode,
    ),
  )

  const taxableAmount = lineTotals.reduce(
    (sum, line) => sum + money(line.taxableAmount),
    0,
  )
  const totalGstAmount = lineTotals.reduce(
    (sum, line) => sum + money(line.totalGstAmount),
    0,
  )
  const grandTotal = lineTotals.reduce(
    (sum, line) => sum + money(line.lineTotal),
    0,
  )

  return {
    lineCount: filledLines.length,
    taxableAmount: formatMoney(taxableAmount),
    totalGstAmount: formatMoney(totalGstAmount),
    grandTotal: formatMoney(grandTotal),
  }
}

export function validateSalesInvoiceForm(
  form: SalesInvoiceFormDraft,
  customer: SalesPartyLike | undefined,
  companyStateCode: string,
) {
  if (!form.customerId || !customer) {
    return 'Select a customer.'
  }

  if (!form.invoiceDate.trim()) {
    return 'Invoice date is required.'
  }

  const filledLines = form.lines.filter(
    (line) =>
      line.itemId &&
      line.itemName.trim() &&
      money(line.quantity) > 0 &&
      money(line.rate) >= 0,
  )

  if (filledLines.length === 0) {
    return 'Add at least one line item with quantity and rate.'
  }

  const gstPartyState = partyStateForRegion(
    form.region,
    customer.stateCode,
    companyStateCode,
  )

  if (!isValidStateCode(gstPartyState)) {
    return 'Customer state is missing. Update the customer master.'
  }

  return null
}

export function validateLedgerMappings(
  ledgerBySystemKey: Partial<Record<string, string>>,
  options?: { requiresInventoryLedgers?: boolean },
) {
  for (const key of REQUIRED_LEDGER_KEYS) {
    if (!ledgerBySystemKey[key]) {
      return `Missing ledger mapping: ${key}`
    }
  }

  if (options?.requiresInventoryLedgers) {
    if (!ledgerBySystemKey.cogs) {
      return 'Missing ledger mapping: cogs'
    }

    if (!ledgerBySystemKey.stock_in_hand) {
      return 'Missing ledger mapping: stock_in_hand'
    }
  }

  return null
}

export function formRequiresInventoryLedgers(
  form: SalesInvoiceFormDraft,
  items: Array<{ id: string; tracksInventory: boolean }>,
) {
  const itemById = new Map(items.map((item) => [item.id, item]))
  return form.lines.some((line) => {
    if (!line.itemId) return false
    return itemById.get(line.itemId)?.tracksInventory ?? false
  })
}

export function buildPostSalesInvoiceInput(
  form: SalesInvoiceFormDraft,
  context: PostSalesInvoiceContext,
) {
  const {
    company,
    ledgerBySystemKey,
    customer,
    invoiceNumber,
  } = context

  const companyStateCode = company.stateCode
  const placeOfSupply = resolvePlaceOfSupply({
    region: form.region,
    partyStateCode: customer.stateCode,
    companyStateCode,
  })
  const customerStateCode = partyStateForRegion(
    form.region,
    customer.stateCode,
    companyStateCode,
  )

  const filledLines = form.lines.filter(
    (line) =>
      line.itemId &&
      line.itemName.trim() &&
      money(line.quantity) > 0,
  )

  return {
    companyId: company.id,
    companyStateCode,
    companyGstin: company.gstin,
    companyAddressLine1: company.addressLine1,
    companyAddressLine2: company.addressLine2,
    companyCity: company.city,
    companyPincode: company.pincode,
    customerId: customer.id,
    customerStateCode,
    placeOfSupply,
    invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.invoiceDate,
    paymentMode: form.paymentMode,
    taxMode: form.taxMode,
    narration: form.narration || undefined,
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: form.godownName,
    salesAccountId: ledgerBySystemKey.sales!,
    outputGstAccountId: ledgerBySystemKey.output_gst!,
    receivableAccountId: ledgerBySystemKey.customer_receivable!,
    cashAccountId: ledgerBySystemKey.cash!,
    cogsAccountId: ledgerBySystemKey.cogs,
    stockAccountId: ledgerBySystemKey.stock_in_hand,
    lines: filledLines.map((line) => ({
      itemId: line.itemId,
      description: line.itemName,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      gstRate: line.gstRate,
      discountPercent: line.discountPercent || undefined,
      godownName: line.godownName || form.godownName,
    })),
  }
}

export const DEFAULT_SALES_SERIES = 'INV'
