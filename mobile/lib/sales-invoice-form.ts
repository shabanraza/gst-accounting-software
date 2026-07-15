export type SupplyRegion = 'local' | 'central'
export type TaxMode = 'exclusive' | 'inclusive'
export type PaymentMode = 'credit' | 'cash'

export type SalesInvoiceLineDraft = {
  key: string
  itemId: string
  itemName: string
  hsnCode: string
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
  gstin?: string | null
}

export type SalesItemLike = {
  id: string
  name: string
  hsnCode: string
  gstRate: string
  baseUnit: string
  saleRate: string
}

export type SalesInvoiceFormDraft = {
  customerId: string
  series: string
  invoiceDate: string
  dueDate: string
  paymentMode: PaymentMode
  taxMode: TaxMode
  region: SupplyRegion
  placeOfSupply: string
  godownName: string
  poReference: string
  transportMode: string
  vehicleNo: string
  lrNumber: string
  challanRef: string
  narration: string
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
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
  selectedPlaceOfSupply: string
  partyStateCode: string
  companyStateCode: string
  fallbackStateCode?: string
}) {
  const fallback = input.fallbackStateCode ?? '27'
  const companyState = isValidStateCode(input.companyStateCode)
    ? input.companyStateCode
    : fallback
  const partyState = isValidStateCode(input.partyStateCode)
    ? input.partyStateCode
    : companyState
  const selected = isValidStateCode(input.selectedPlaceOfSupply)
    ? input.selectedPlaceOfSupply
    : ''

  if (input.region === 'local') {
    return companyState
  }

  return selected || partyState || companyState
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

export const DEFAULT_SALES_SERIES = 'INV'

export function createEmptySalesLine(godownName: string): SalesInvoiceLineDraft {
  return {
    key: randomId(),
    itemId: '',
    itemName: '',
    hsnCode: '',
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
  companyStateCode = '27',
): SalesInvoiceFormDraft {
  return {
    customerId: '',
    series: DEFAULT_SALES_SERIES,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    paymentMode: 'credit',
    taxMode: 'exclusive',
    region: 'local',
    placeOfSupply: companyStateCode,
    godownName,
    poReference: '',
    transportMode: '',
    vehicleNo: '',
    lrNumber: '',
    challanRef: '',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
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
    hsnCode: item.hsnCode,
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
    cgstAmount: formatMoney(cgstAmount),
    sgstAmount: formatMoney(sgstAmount),
    igstAmount: formatMoney(igstAmount),
    totalGstAmount: formatMoney(totalGstAmount),
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
  const cgstAmount = lineTotals.reduce(
    (sum, line) => sum + money(line.cgstAmount),
    0,
  )
  const sgstAmount = lineTotals.reduce(
    (sum, line) => sum + money(line.sgstAmount),
    0,
  )
  const igstAmount = lineTotals.reduce(
    (sum, line) => sum + money(line.igstAmount),
    0,
  )
  const totalGstAmount = cgstAmount + sgstAmount + igstAmount
  const billDiscountAmount = money(form.billDiscount)
  const sundryTotal =
    money(form.freight) +
    money(form.packing) +
    money(form.roundOff) -
    billDiscountAmount
  const grandTotal = taxableAmount + totalGstAmount + sundryTotal

  return {
    lineCount: filledLines.length,
    taxableAmount: formatMoney(taxableAmount),
    cgstAmount: formatMoney(cgstAmount),
    sgstAmount: formatMoney(sgstAmount),
    igstAmount: formatMoney(igstAmount),
    totalGstAmount: formatMoney(totalGstAmount),
    sundryTotal: formatMoney(sundryTotal),
    billDiscountAmount: formatMoney(billDiscountAmount),
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

  if (!isValidStateCode(companyStateCode)) {
    return 'Set a valid company state code in Company settings before posting.'
  }

  const resolvedPlaceOfSupply = resolvePlaceOfSupply({
    region: form.region,
    selectedPlaceOfSupply: form.placeOfSupply,
    partyStateCode: customer.stateCode,
    companyStateCode,
  })

  if (!isValidStateCode(resolvedPlaceOfSupply)) {
    return 'Select a place of supply or set the customer state.'
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
    return 'Customer state is missing. Update the customer master or place of supply.'
  }

  return null
}

const LEDGER_LABELS: Record<string, string> = {
  sales: 'Sales account',
  output_gst: 'Output GST account',
  customer_receivable: 'Customer receivable account',
  cash: 'Cash account',
  cogs: 'Cost of goods sold account',
  stock_in_hand: 'Stock in hand account',
}

export function validateLedgerMappings(
  ledgerBySystemKey: Partial<Record<string, string>>,
  options?: { requiresInventoryLedgers?: boolean },
) {
  for (const key of REQUIRED_LEDGER_KEYS) {
    if (!ledgerBySystemKey[key]) {
      return `Missing chart of accounts mapping: ${LEDGER_LABELS[key] ?? key}. Ask your admin to complete company setup.`
    }
  }

  if (options?.requiresInventoryLedgers) {
    if (!ledgerBySystemKey.cogs) {
      return `Missing chart of accounts mapping: ${LEDGER_LABELS.cogs}. Ask your admin to complete company setup.`
    }

    if (!ledgerBySystemKey.stock_in_hand) {
      return `Missing chart of accounts mapping: ${LEDGER_LABELS.stock_in_hand}. Ask your admin to complete company setup.`
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
  const { company, ledgerBySystemKey, customer, invoiceNumber } = context

  const companyStateCode = company.stateCode
  const placeOfSupply = resolvePlaceOfSupply({
    region: form.region,
    selectedPlaceOfSupply: form.placeOfSupply,
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
      line.itemId && line.itemName.trim() && money(line.quantity) > 0,
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
    dueDate: form.dueDate.trim() || form.invoiceDate,
    paymentMode: form.paymentMode,
    taxMode: form.taxMode,
    poReference: form.poReference.trim() || undefined,
    transportMode: form.transportMode.trim() || undefined,
    vehicleNo: form.vehicleNo.trim() || undefined,
    lrNumber: form.lrNumber.trim() || undefined,
    challanRef: form.challanRef.trim() || undefined,
    narration: form.narration.trim() || undefined,
    freight: form.freight,
    packing: form.packing,
    roundOff: form.roundOff,
    billDiscount: form.billDiscount,
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
