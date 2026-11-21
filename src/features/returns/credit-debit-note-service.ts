import Decimal from 'decimal.js'

import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import {
  calculateGst,
  calculateInclusiveGst,
} from '#/features/gst/gst-calculator.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type { GstCalculation } from '#/features/gst/gst-calculator.ts'

export type CreditDebitNoteType = 'credit' | 'debit'

export type CreditDebitNoteRecord = {
  id: string
  companyId: string
  noteType: CreditDebitNoteType
  noteNumber: string
  noteDate: string
  partyId: string
  referenceDocumentId: string | null
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  ledgerEntryId: string
  narration: string
  createdAt: Date
}

export interface CreditDebitNoteRepository {
  create: (note: CreditDebitNoteRecord) => Promise<CreditDebitNoteRecord>
  listByCompanyId: (companyId: string) => Promise<Array<CreditDebitNoteRecord>>
  listByReference: (
    companyId: string,
    referenceDocumentId: string,
  ) => Promise<Array<CreditDebitNoteRecord>>
}

export type NoteNumberDependencies = {
  sequences: DocumentSequenceRepository
  financialYears: FinancialYearRepository
}

export class MissingFinancialYearError extends DomainError {
  constructor() {
    super('Set up a financial year before posting returns')
    this.name = 'MissingFinancialYearError'
  }
}

function formatMoney(value: Decimal) {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

export class InvalidReturnError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidReturnError'
  }
}

export type ReturnSupply = { companyStateCode: string; partyStateCode: string }

type ReturnableDocument = {
  taxMode?: string
  lines: Array<{
    itemId?: string | null
    quantity: string
    gstRate: string
    taxableAmount: string
    lineTotal: string
  }>
}

/**
 * Prices a returned line at what the original document actually charged for
 * that item, pro-rata by quantity across every line of the item, so line
 * discounts and GST-inclusive prices carry through: an inclusive invoice is
 * returned at its inclusive price, never with GST added on top. Refuses a
 * quantity above what the document billed for the item. A line with no
 * matching item uses the rate entered.
 */
export function priceReturnLine(
  document: ReturnableDocument,
  line: { itemId: string; quantity: string; rate: string; gstRate: string },
  supply: ReturnSupply,
): GstCalculation {
  const inclusive = document.taxMode === 'inclusive'
  const charged = document.lines.filter(
    (documentLine) =>
      documentLine.itemId === line.itemId &&
      new Decimal(documentLine.quantity).gt(0),
  )
  const quantity = new Decimal(line.quantity)

  if (charged.length === 0) {
    const amount = formatMoney(quantity.mul(line.rate))
    return inclusive && new Decimal(line.gstRate).gt(0)
      ? calculateInclusiveGst({ inclusiveAmount: amount, gstRate: line.gstRate, ...supply })
      : calculateGst({ taxableAmount: amount, gstRate: line.gstRate, ...supply })
  }

  const billedQuantity = charged.reduce(
    (sum, documentLine) => sum.plus(documentLine.quantity),
    new Decimal(0),
  )
  if (quantity.gt(billedQuantity)) {
    throw new InvalidReturnError(
      `Return quantity is more than the ${billedQuantity.toString()} billed`,
    )
  }
  const rates = new Set(charged.map((documentLine) => new Decimal(documentLine.gstRate).toFixed(2)))
  const gstRate = rates.size === 1 ? [...rates][0] : line.gstRate
  const share = (field: 'taxableAmount' | 'lineTotal') =>
    formatMoney(
      charged
        .reduce((sum, documentLine) => sum.plus(documentLine[field]), new Decimal(0))
        .mul(quantity)
        .div(billedQuantity),
    )

  return inclusive && new Decimal(gstRate).gt(0)
    ? calculateInclusiveGst({ inclusiveAmount: share('lineTotal'), gstRate, ...supply })
    : calculateGst({ taxableAmount: share('taxableAmount'), gstRate, ...supply })
}

/**
 * Keeps a return within what the original document charged. Each return is
 * priced and rounded on its own, so after several part returns the last one
 * can be a paisa or two away from what is left: a return that reaches what is
 * left (within a paisa either way per earlier return) takes exactly the
 * taxable value and GST still left, so the returns add up to the document.
 * Any other return keeps its own value, with GST capped at what is left; one
 * worth more than is left is then refused by `applyNoteToDocument`.
 */
export async function fitReturnToDocument(
  repository: CreditDebitNoteRepository,
  input: {
    companyId: string
    document: { id: string; taxableAmount: string; totalGstAmount: string }
    taxableTotal: Decimal
    gstTotal: Decimal
  },
): Promise<{ taxableTotal: Decimal; gstTotal: Decimal }> {
  const earlier = await repository.listByReference(
    input.companyId,
    input.document.id,
  )
  const remainingTaxable = earlier.reduce(
    (left, note) => left.minus(note.taxableAmount),
    new Decimal(input.document.taxableAmount),
  )
  const remainingGst = Decimal.max(
    0,
    earlier.reduce(
      (left, note) => left.minus(note.totalGstAmount),
      new Decimal(input.document.totalGstAmount),
    ),
  )
  const tolerance = new Decimal('0.01').mul(Math.max(1, earlier.length))
  if (input.taxableTotal.minus(remainingTaxable).abs().lte(tolerance)) {
    return {
      taxableTotal: Decimal.max(0, remainingTaxable),
      gstTotal: remainingGst,
    }
  }
  return {
    taxableTotal: input.taxableTotal,
    gstTotal: Decimal.min(input.gstTotal, remainingGst),
  }
}

/**
 * Checks that this note plus earlier notes on the document stay within its
 * total, and returns the document's amount due and status after the note.
 * The amount due never goes below zero; any excess is the party's credit.
 */
export async function applyNoteToDocument(
  repository: CreditDebitNoteRepository,
  input: {
    companyId: string
    document: { id: string; totalAmount: string; outstandingAmount: string }
    noteAmount: string
    documentLabel: 'invoice' | 'bill'
  },
) {
  const earlier = await repository.listByReference(
    input.companyId,
    input.document.id,
  )
  const returned = earlier.reduce(
    (sum, note) => sum.plus(note.totalAmount),
    new Decimal(input.noteAmount),
  )
  const total = new Decimal(input.document.totalAmount)
  if (returned.gt(total)) {
    throw new InvalidReturnError(
      `Returns cannot exceed the ${input.documentLabel} total`,
    )
  }
  const outstanding = Decimal.max(
    0,
    new Decimal(input.document.outstandingAmount).minus(input.noteAmount),
  )
  const paymentStatus: 'Paid' | 'Part paid' | 'Pending' = outstanding.lte(0)
    ? 'Paid'
    : outstanding.lt(total)
      ? 'Part paid'
      : 'Pending'
  return { outstandingAmount: outstanding.toFixed(2), paymentStatus }
}

const noteSeries: Record<CreditDebitNoteType, string> = {
  credit: 'CN',
  debit: 'DN',
}

/**
 * Reserves the next CN-0001 / DN-0001 style number in the financial year that
 * contains the note date (falling back to the active year).
 */
export async function allocateNoteNumber(
  deps: NoteNumberDependencies,
  input: { companyId: string; noteType: CreditDebitNoteType; noteDate: string },
): Promise<string> {
  const financialYears = await deps.financialYears.listByCompanyId(
    input.companyId,
  )
  const financialYear =
    financialYears.find(
      (year) =>
        year.startDate <= input.noteDate && input.noteDate <= year.endDate,
    ) ??
    financialYears.find((year) => year.isActive) ??
    financialYears.at(0)

  if (!financialYear) {
    throw new MissingFinancialYearError()
  }

  return nextDocumentNumber(deps.sequences, {
    companyId: input.companyId,
    financialYearId: financialYear.id,
    voucherType: `${input.noteType}_note`,
    series: noteSeries[input.noteType],
    padLength: 4,
  })
}

export async function recordCreditDebitNote(
  repository: CreditDebitNoteRepository,
  input: Omit<CreditDebitNoteRecord, 'id' | 'createdAt'>,
): Promise<CreditDebitNoteRecord> {
  return repository.create({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}
