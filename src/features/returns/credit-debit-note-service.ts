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
