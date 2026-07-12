import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { calculateGst } from '#/features/gst/gst-calculator.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { TaxMode } from '#/features/accounting/voucher-math.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type PurchaseBillLineInput = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
  discountPercent?: string
  godownName?: string | null
}

export type PostPurchaseBillInput = {
  companyId: string
  companyStateCode: string
  financialYearStart: string
  supplierId: string
  supplierStateCode?: string
  supplierBillNumber: string
  billDate: string
  dueDate: string
  placeOfSupply?: string
  reverseCharge?: boolean
  taxMode?: TaxMode
  narration?: string
  freight?: string
  packing?: string
  roundOff?: string
  billDiscount?: string
  godownName?: string | null
  purchaseAccountId: string
  inputGstAccountId: string
  payableAccountId: string
  stockAccountId: string
  skipStockMovement?: boolean
  lines: Array<PurchaseBillLineInput>
}

export type PurchaseBillLineRecord = PurchaseBillLineInput & {
  id: string
  discountPercent: string
  discountAmount: string
  taxableAmount: string
  gstAmount: string
  lineTotal: string
  godownName: string | null
}

export type PurchaseBillRecord = {
  id: string
  companyId: string
  financialYearStart: string
  supplierId: string
  supplierBillNumber: string
  billDate: string
  dueDate: string
  placeOfSupply: string
  reverseCharge: boolean
  paymentStatus: 'Paid' | 'Part paid' | 'Pending'
  taxMode: TaxMode
  narration: string
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
  godownName: string | null
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  outstandingAmount: string
  ledgerEntryId: string
  lines: Array<PurchaseBillLineRecord>
  createdAt: Date
}

export interface PurchaseBillRepository {
  findBySupplierBillNumber: (input: {
    companyId: string
    supplierId: string
    supplierBillNumber: string
    financialYearStart: string
  }) => Promise<PurchaseBillRecord | null>
  create: (bill: PurchaseBillRecord) => Promise<PurchaseBillRecord>
  findById: (id: string) => Promise<PurchaseBillRecord | null>
  save: (bill: PurchaseBillRecord) => Promise<PurchaseBillRecord>
  listByCompanyId: (companyId: string) => Promise<Array<PurchaseBillRecord>>
}

export type PurchaseBillDependencies = {
  bills: PurchaseBillRepository
  posting: LedgerPostingRepository
  stock: StockMovementRepository & StockBalanceRepository
}

export class DuplicateSupplierBillError extends Error {
  constructor(supplierBillNumber: string) {
    super(
      `Supplier bill number already exists for this financial year: ${supplierBillNumber}`,
    )
    this.name = 'DuplicateSupplierBillError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string) {
  return new Decimal(value || '0')
}

function formatMoney(value: Decimal) {
  return value.toFixed(2)
}

export async function postPurchaseBill(
  deps: PurchaseBillDependencies,
  input: PostPurchaseBillInput,
): Promise<PurchaseBillRecord> {
  const duplicate = await deps.bills.findBySupplierBillNumber({
    companyId: input.companyId,
    supplierId: input.supplierId,
    supplierBillNumber: input.supplierBillNumber,
    financialYearStart: input.financialYearStart,
  })

  if (duplicate) {
    throw new DuplicateSupplierBillError(input.supplierBillNumber)
  }

  const taxMode = input.taxMode ?? 'exclusive'
  const partyStateCode = input.supplierStateCode ?? '24'
  let taxableTotal = new Decimal(0)
  let gstTotal = new Decimal(0)

  const lines: Array<PurchaseBillLineRecord> = input.lines.map((line) => {
    const discountPercent = money(line.discountPercent ?? '0')
    const gross = money(line.quantity).mul(money(line.rate))
    const discountAmount = gross.mul(discountPercent).div(100)
    const net = Decimal.max(gross.minus(discountAmount), new Decimal(0))
    const gstRate = money(line.gstRate)

    let taxableAmount = net
    if (taxMode === 'inclusive' && gstRate.gt(0)) {
      taxableAmount = net.mul(100).div(gstRate.plus(100))
    }

    const gst = calculateGst({
      taxableAmount: formatMoney(taxableAmount),
      gstRate: line.gstRate,
      companyStateCode: input.companyStateCode,
      partyStateCode,
    })

    taxableTotal = taxableTotal.plus(money(gst.taxableAmount))
    gstTotal = gstTotal.plus(money(gst.totalGstAmount))

    return {
      ...line,
      id: crypto.randomUUID(),
      discountPercent: formatMoney(discountPercent),
      discountAmount: formatMoney(discountAmount),
      taxableAmount: gst.taxableAmount,
      gstAmount: gst.totalGstAmount,
      lineTotal: taxMode === 'inclusive' ? formatMoney(net) : gst.totalAmount,
      godownName: line.godownName ?? input.godownName ?? null,
    }
  })

  const freight = money(input.freight ?? '0')
  const packing = money(input.packing ?? '0')
  const roundOff = money(input.roundOff ?? '0')
  const billDiscount = money(input.billDiscount ?? '0')
  const sundryNet = freight.plus(packing).plus(roundOff).minus(billDiscount)
  const totalAmount = taxableTotal.plus(gstTotal).plus(sundryNet)
  const billId = crypto.randomUUID()

  const inventoryDebit = taxableTotal.plus(sundryNet)
  const ledgerLines = [
    {
      ledgerAccountId: input.stockAccountId,
      debit: formatMoney(inventoryDebit),
      credit: '0.00',
    },
    {
      ledgerAccountId: input.inputGstAccountId,
      debit: formatMoney(gstTotal),
      credit: '0.00',
    },
    {
      ledgerAccountId: input.payableAccountId,
      debit: '0.00',
      credit: formatMoney(totalAmount),
    },
  ]

  // Keep purchaseAccountId available for expense-only bills; unused when stock posts.
  void input.purchaseAccountId

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.billDate,
    narration:
      input.narration?.trim() || `Purchase bill ${input.supplierBillNumber}`,
    voucherType: 'purchase',
    lines: ledgerLines,
  })

  for (const line of lines) {
    if (input.skipStockMovement) {
      continue
    }

    await recordStockMovement(deps.stock, deps.stock, {
      companyId: input.companyId,
      itemId: line.itemId,
      movementType: 'purchase_in',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'purchase_bill',
      referenceId: billId,
      occurredOn: input.billDate,
      godownName: line.godownName,
    })
  }

  const bill: PurchaseBillRecord = {
    id: billId,
    companyId: input.companyId,
    financialYearStart: input.financialYearStart,
    supplierId: input.supplierId,
    supplierBillNumber: input.supplierBillNumber,
    billDate: input.billDate,
    dueDate: input.dueDate,
    placeOfSupply: input.placeOfSupply ?? input.companyStateCode,
    reverseCharge: input.reverseCharge ?? false,
    paymentStatus: 'Pending',
    taxMode,
    narration: input.narration?.trim() || '',
    freight: formatMoney(freight),
    packing: formatMoney(packing),
    roundOff: formatMoney(roundOff),
    billDiscount: formatMoney(billDiscount),
    godownName: input.godownName ?? null,
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    outstandingAmount: formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    lines,
    createdAt: new Date(),
  }

  return deps.bills.create(bill)
}
