import {
  isValidStateCode,
  partyStateForRegion,
  resolvePlaceOfSupply,
  type SupplyRegion,
  type TaxMode,
} from './sales-invoice-form.ts'

export type { SupplyRegion, TaxMode }

export type PurchaseBillLineDraft = {
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

export type PurchasePartyLike = {
  id: string
  name: string
  partyType: 'customer' | 'supplier' | 'both'
  stateCode: string
}

export type PurchaseItemLike = {
  id: string
  name: string
  gstRate: string
  baseUnit: string
  purchaseRate: string
}

export type PurchaseBillFormDraft = {
  supplierId: string
  billDate: string
  taxMode: TaxMode
  region: SupplyRegion
  godownName: string
  narration: string
  lines: Array<PurchaseBillLineDraft>
}

export type WorkspaceCompanyLike = {
  id: string
  gstin: string | null
  stateCode: string
  financialYearStart: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
}

export type PostPurchaseBillContext = {
  company: WorkspaceCompanyLike
  ledgerBySystemKey: Partial<Record<string, string>>
  supplier: PurchasePartyLike
  supplierBillNumber: string
}

const REQUIRED_LEDGER_KEYS = [
  'purchase',
  'input_gst',
  'supplier_payable',
  'stock_in_hand',
] as const

function money(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toFixed(2)
}

export function filterSupplierParties(parties: Array<PurchasePartyLike>) {
  return parties.filter(
    (party) => party.partyType === 'supplier' || party.partyType === 'both',
  )
}

export function createEmptyPurchaseLine(
  godownName: string,
): PurchaseBillLineDraft {
  return {
    key: crypto.randomUUID(),
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

export function createInitialPurchaseBillForm(
  godownName: string,
): PurchaseBillFormDraft {
  return {
    supplierId: '',
    billDate: new Date().toISOString().slice(0, 10),
    taxMode: 'exclusive',
    region: 'local',
    godownName,
    narration: '',
    lines: [createEmptyPurchaseLine(godownName)],
  }
}

export function applyItemToPurchaseLine(
  line: PurchaseBillLineDraft,
  item: PurchaseItemLike,
  godownName: string,
): PurchaseBillLineDraft {
  return {
    ...line,
    itemId: item.id,
    itemName: item.name,
    gstRate: item.gstRate,
    unit: item.baseUnit,
    rate: item.purchaseRate,
    godownName: line.godownName || godownName,
  }
}

export function computePurchaseLinePreview(
  line: PurchaseBillLineDraft,
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

export function computePurchaseFormTotals(
  form: PurchaseBillFormDraft,
  partyStateCode: string,
  companyStateCode: string,
) {
  const filledLines = form.lines.filter((line) => line.itemId)
  const lineTotals = filledLines.map((line) =>
    computePurchaseLinePreview(
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

export function validatePurchaseBillForm(
  form: PurchaseBillFormDraft,
  supplier: PurchasePartyLike | undefined,
  companyStateCode: string,
) {
  if (!form.supplierId || !supplier) {
    return 'Select a supplier.'
  }

  if (!form.billDate.trim()) {
    return 'Bill date is required.'
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
    supplier.stateCode,
    companyStateCode,
  )

  if (!isValidStateCode(gstPartyState)) {
    return 'Supplier state is missing. Update the supplier master.'
  }

  return null
}

export function validatePurchaseLedgerMappings(
  ledgerBySystemKey: Partial<Record<string, string>>,
) {
  for (const key of REQUIRED_LEDGER_KEYS) {
    if (!ledgerBySystemKey[key]) {
      return `Missing ledger mapping: ${key}`
    }
  }

  return null
}

export function validateActiveFinancialYearId(
  activeFinancialYearId: string | null,
) {
  if (!activeFinancialYearId) {
    return 'Financial year is not configured.'
  }

  return null
}

export function buildPostPurchaseBillInput(
  form: PurchaseBillFormDraft,
  context: PostPurchaseBillContext,
) {
  const { company, ledgerBySystemKey, supplier, supplierBillNumber } = context

  const companyStateCode = company.stateCode
  const placeOfSupply = resolvePlaceOfSupply({
    region: form.region,
    partyStateCode: supplier.stateCode,
    companyStateCode,
  })
  const supplierStateCode = partyStateForRegion(
    form.region,
    supplier.stateCode,
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
    financialYearStart: company.financialYearStart,
    supplierId: supplier.id,
    supplierStateCode,
    placeOfSupply,
    supplierBillNumber,
    billDate: form.billDate,
    dueDate: form.billDate,
    taxMode: form.taxMode,
    narration: form.narration || undefined,
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: form.godownName,
    purchaseAccountId: ledgerBySystemKey.purchase!,
    inputGstAccountId: ledgerBySystemKey.input_gst!,
    payableAccountId: ledgerBySystemKey.supplier_payable!,
    stockAccountId: ledgerBySystemKey.stock_in_hand!,
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

export const DEFAULT_PURCHASE_SERIES = 'PUR'
