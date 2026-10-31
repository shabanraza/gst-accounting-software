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
  /** With both, returned stock is booked back: Dr stock, Cr COGS. */
  stockAccountId?: string
  cogsAccountId?: string
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

  // Returned goods come back at the unit cost the invoice took them out at;
  // a sale with no recorded cost (before values were tracked) uses the average.
  const saleMovements = await deps.stock.listByReference(
    input.companyId,
    'sales_invoice',
    input.salesInvoiceId,
  )
  let returnedCost = new Decimal(0)
  for (const line of input.lines) {
    const sold = saleMovements.find(
      (movement) => movement.itemId === line.itemId,
    )
    const movement = await recordStockMovement(deps.stock, deps.stock, {
      companyId: input.companyId,
      itemId: line.itemId,
      itemName: line.description,
      movementType: 'sales_return_in',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'sales_return',
      referenceId: returnId,
      occurredOn: input.returnDate,
      value:
        sold && money(sold.value).gt(0)
          ? formatMoney(money(sold.value).mul(line.quantity).div(sold.quantity))
          : undefined,
    })
    returnedCost = returnedCost.plus(money(movement.value))
  }

  const costLines =
    input.stockAccountId && input.cogsAccountId && returnedCost.gt(0)
      ? [
          {
            ledgerAccountId: input.stockAccountId,
            debit: formatMoney(returnedCost),
            credit: '0.00',
          },
          {
            ledgerAccountId: input.cogsAccountId,
            debit: '0.00',
            credit: formatMoney(returnedCost),
          },
        ]
      : []

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.returnDate,
    narration: `Sales return for invoice ${input.salesInvoiceId}`,
    voucherType: 'journal',
    lines: [
      ...costLines,
      {
        ledgerAccountId: input.salesAccountId,
        debit: formatMoney(taxableTotal),
        credit: '0.00',
      },
      ...(gstTotal.isZero()
        ? []
        : [
            {
              ledgerAccountId: input.outputGstAccountId,
              debit: formatMoney(gstTotal),
              credit: '0.00',
            },
          ]),
      {
        ledgerAccountId: input.receivableAccountId,
        debit: '0.00',
        credit: formatMoney(totalAmount),
      },
    ],
  })

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
