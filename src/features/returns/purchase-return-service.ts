import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { calculateGst } from '#/features/gst/gst-calculator.ts'
import { recordCreditDebitNote } from '#/features/returns/credit-debit-note-service.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { ReturnLineInput } from '#/features/returns/sales-return-service.ts'

export type PostPurchaseReturnInput = {
  companyId: string
  companyStateCode: string
  supplierId: string
  supplierStateCode: string
  purchaseBillId: string
  returnDate: string
  purchaseAccountId: string
  inputGstAccountId: string
  payableAccountId: string
  /**
   * With it, returned stock leaves the books at moving-average cost and the
   * gap to the return value goes to purchases.
   */
  stockAccountId?: string
  lines: Array<ReturnLineInput>
}

export type PurchaseReturnRecord = {
  id: string
  companyId: string
  purchaseBillId: string
  returnDate: string
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  ledgerEntryId: string
  noteNumber: string
  createdAt: Date
}

export type PurchaseReturnDependencies = {
  posting: LedgerPostingRepository
  stock: StockMovementRepository & StockBalanceRepository
  notes: CreditDebitNoteRepository
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string) {
  return new Decimal(value)
}

function formatMoney(value: Decimal) {
  return value.toFixed(2)
}

export async function postPurchaseReturn(
  deps: PurchaseReturnDependencies,
  input: PostPurchaseReturnInput,
): Promise<PurchaseReturnRecord> {
  let taxableTotal = new Decimal(0)
  let gstTotal = new Decimal(0)

  for (const line of input.lines) {
    const taxableAmount = money(line.quantity).mul(money(line.rate))
    const gst = calculateGst({
      taxableAmount: formatMoney(taxableAmount),
      gstRate: line.gstRate,
      companyStateCode: input.companyStateCode,
      partyStateCode: input.supplierStateCode,
    })
    taxableTotal = taxableTotal.plus(money(gst.taxableAmount))
    gstTotal = gstTotal.plus(money(gst.totalGstAmount))
  }

  const totalAmount = taxableTotal.plus(gstTotal)
  const returnId = crypto.randomUUID()

  let returnedCost = new Decimal(0)
  for (const line of input.lines) {
    const movement = await recordStockMovement(deps.stock, deps.stock, {
      companyId: input.companyId,
      itemId: line.itemId,
      itemName: line.description,
      movementType: 'purchase_return_out',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'purchase_return',
      referenceId: returnId,
      occurredOn: input.returnDate,
    })
    returnedCost = returnedCost.plus(money(movement.value))
  }

  const stockCredit = input.stockAccountId ? returnedCost : new Decimal(0)
  const purchaseCredit = taxableTotal.minus(stockCredit)
  const ledgerLines = [
    {
      ledgerAccountId: input.payableAccountId,
      debit: formatMoney(totalAmount),
      credit: '0.00',
    },
    {
      ledgerAccountId: input.stockAccountId ?? input.purchaseAccountId,
      debit: '0.00',
      credit: formatMoney(stockCredit),
    },
    {
      ledgerAccountId: input.purchaseAccountId,
      debit: purchaseCredit.isNegative()
        ? formatMoney(purchaseCredit.negated())
        : '0.00',
      credit: purchaseCredit.isNegative()
        ? '0.00'
        : formatMoney(purchaseCredit),
    },
    {
      ledgerAccountId: input.inputGstAccountId,
      debit: '0.00',
      credit: formatMoney(gstTotal),
    },
  ]

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.returnDate,
    narration: `Purchase return for bill ${input.purchaseBillId}`,
    voucherType: 'journal',
    lines: ledgerLines.filter(
      (line) => !money(line.debit).isZero() || !money(line.credit).isZero(),
    ),
  })

  const note = await recordCreditDebitNote(deps.notes, {
    companyId: input.companyId,
    noteType: 'debit',
    noteDate: input.returnDate,
    partyId: input.supplierId,
    referenceDocumentId: input.purchaseBillId,
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    narration: `Purchase return for bill ${input.purchaseBillId}`,
  })

  return {
    id: returnId,
    companyId: input.companyId,
    purchaseBillId: input.purchaseBillId,
    returnDate: input.returnDate,
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    noteNumber: note.noteNumber,
    createdAt: new Date(),
  }
}
