import { randomId } from './random-id.ts'

export type JournalLineDraft = {
  key: string
  ledgerAccountId: string
  debit: string
  credit: string
}

export type JournalFormDraft = {
  entryDate: string
  narration: string
  lines: Array<JournalLineDraft>
}

export function createEmptyJournalLine(): JournalLineDraft {
  return {
    key: randomId(),
    ledgerAccountId: '',
    debit: '',
    credit: '',
  }
}

export function createInitialJournalForm(): JournalFormDraft {
  return {
    entryDate: new Date().toISOString().slice(0, 10),
    narration: '',
    lines: [createEmptyJournalLine(), createEmptyJournalLine()],
  }
}

export function validateJournalForm(form: JournalFormDraft) {
  const filled = form.lines.filter(
    (line) => line.ledgerAccountId && (line.debit || line.credit),
  )

  if (filled.length < 2) {
    return 'Add at least two ledger lines.'
  }

  let debitTotal = 0
  let creditTotal = 0

  for (const line of filled) {
    const debit = Number(line.debit || 0)
    const credit = Number(line.credit || 0)
    if (Number.isFinite(debit)) debitTotal += debit
    if (Number.isFinite(credit)) creditTotal += credit
  }

  if (debitTotal <= 0) {
    return 'Enter debit and credit amounts.'
  }

  if (Math.abs(debitTotal - creditTotal) > 0.001) {
    return `Debits (${debitTotal.toFixed(2)}) must equal credits (${creditTotal.toFixed(2)}).`
  }

  return null
}

export function buildPostLedgerEntryInput(
  form: JournalFormDraft,
  companyId: string,
) {
  const filled = form.lines.filter(
    (line) => line.ledgerAccountId && (line.debit || line.credit),
  )

  return {
    companyId,
    entryDate: form.entryDate,
    narration: form.narration.trim() || 'Journal entry',
    voucherType: 'journal' as const,
    lines: filled.map((line) => ({
      ledgerAccountId: line.ledgerAccountId,
      debit: line.debit || '0.00',
      credit: line.credit || '0.00',
    })),
  }
}
