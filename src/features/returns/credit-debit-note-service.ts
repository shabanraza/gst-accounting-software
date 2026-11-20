import Decimal from 'decimal.js'

import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { DomainError } from '#/lib/domain-error.ts'

import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'

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

export class InvalidReturnError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidReturnError'
  }
}

/**
 * Checks that this note plus earlier notes on the document stay within its
 * total, and returns the document's amount due and status after the note.
 * The amount due never goes below zero; any excess is the party's credit.
 */
/**
 * Keeps a return's GST within what the original document charged. Returns
 * recompute GST at today's rounding, which can differ by a paisa from a
 * document saved earlier: a return of everything still left reverses
 * exactly the GST still left, and any return is capped at it.
 */
export async function fitReturnGstToDocument(
  repository: CreditDebitNoteRepository,
  input: {
    companyId: string
    document: { id: string; taxableAmount: string; totalGstAmount: string }
    taxableTotal: Decimal
    gstTotal: Decimal
  },
): Promise<Decimal> {
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
  if (input.taxableTotal.eq(remainingTaxable)) return remainingGst
  return Decimal.min(input.gstTotal, remainingGst)
}

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
