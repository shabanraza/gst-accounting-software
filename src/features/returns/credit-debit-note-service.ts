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

export function buildNoteNumber(noteType: CreditDebitNoteType, id: string) {
  const prefix = noteType === 'credit' ? 'CN' : 'DN'
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`
}

export async function recordCreditDebitNote(
  repository: CreditDebitNoteRepository,
  input: Omit<CreditDebitNoteRecord, 'id' | 'noteNumber' | 'createdAt'>,
): Promise<CreditDebitNoteRecord> {
  const id = crypto.randomUUID()

  return repository.create({
    ...input,
    id,
    noteNumber: buildNoteNumber(input.noteType, id),
    createdAt: new Date(),
  })
}
