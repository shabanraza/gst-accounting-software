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

export type ReturnLineInput = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
}

export type PostSalesReturnInput = {
  companyId: string
  companyStateCode: string
  customerId: string
  customerStateCode: string
  salesInvoiceId: string
  returnDate: string
  salesAccountId: string
  outputGstAccountId: string
  receivableAccountId: string
  lines: Array<ReturnLineInput>
}

export type SalesReturnRecord = {
  id: string
  companyId: string
  salesInvoiceId: string
  returnDate: string
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  ledgerEntryId: string
  noteNumber: string
  createdAt: Date
}

export type SalesReturnDependencies = {
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

export async function postSalesReturn(
  deps: SalesReturnDependencies,
  input: PostSalesReturnInput,
): Promise<SalesReturnRecord> {
  let taxableTotal = new Decimal(0)
  let gstTotal = new Decimal(0)

  for (const line of input.lines) {
    const taxableAmount = money(line.quantity).mul(money(line.rate))
    const gst = calculateGst({
      taxableAmount: formatMoney(taxableAmount),
      gstRate: line.gstRate,
      companyStateCode: input.companyStateCode,
      partyStateCode: input.customerStateCode,
    })
    taxableTotal = taxableTotal.plus(money(gst.taxableAmount))
    gstTotal = gstTotal.plus(money(gst.totalGstAmount))
  }

  const totalAmount = taxableTotal.plus(gstTotal)
  const returnId = crypto.randomUUID()

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.returnDate,
    narration: `Sales return for invoice ${input.salesInvoiceId}`,
    voucherType: 'journal',
    lines: [
      {
        ledgerAccountId: input.salesAccountId,
        debit: formatMoney(taxableTotal),
        credit: '0.00',
      },
      {
        ledgerAccountId: input.outputGstAccountId,
        debit: formatMoney(gstTotal),
        credit: '0.00',
      },
      {
        ledgerAccountId: input.receivableAccountId,
        debit: '0.00',
        credit: formatMoney(totalAmount),
      },
    ],
  })

  for (const line of input.lines) {
    await recordStockMovement(deps.stock, deps.stock, {
      companyId: input.companyId,
      itemId: line.itemId,
      movementType: 'sales_return_in',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'sales_return',
      referenceId: returnId,
      occurredOn: input.returnDate,
    })
  }

  const note = await recordCreditDebitNote(deps.notes, {
    companyId: input.companyId,
    noteType: 'credit',
    noteDate: input.returnDate,
    partyId: input.customerId,
    referenceDocumentId: input.salesInvoiceId,
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    narration: `Sales return for invoice ${input.salesInvoiceId}`,
  })

  return {
    id: returnId,
    companyId: input.companyId,
    salesInvoiceId: input.salesInvoiceId,
    returnDate: input.returnDate,
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    noteNumber: note.noteNumber,
    createdAt: new Date(),
  }
}
