import Decimal from 'decimal.js'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { ParsedBankStatementLine } from '#/features/banking/bank-statement-parser.ts'

export type BankStatementRecord = {
  id: string
  companyId: string
  ledgerAccountId: string
  periodStart: string
  periodEnd: string
  sourceFilename: string
  importedAt: Date
  importedByUserId: string
}

export type BankStatementLineRecord = ParsedBankStatementLine & {
  id: string
  companyId: string
  statementId: string
  ledgerAccountId: string
}

export type BankReconciliationMatchRecord = {
  id: string
  companyId: string
  statementLineId: string
  ledgerEntryId: string
  matchedAt: Date
  matchedByUserId: string
}

export type BookBankLine = {
  entryId: string
  entryDate: string
  narration: string
  voucherType: string
  ledgerAccountId: string
  debit: string
  credit: string
}

export type BankReconciliationRowStatus =
  | 'matched'
  | 'unmatched_statement'
  | 'unmatched_book'

export type BankReconciliationRow = {
  statementLineId: string | null
  statementDate: string | null
  statementDescription: string | null
  statementDebit: string | null
  statementCredit: string | null
  bookEntryId: string | null
  bookDate: string | null
  bookNarration: string | null
  bookDebit: string | null
  bookCredit: string | null
  status: BankReconciliationRowStatus
  matchId: string | null
}

export type BankReconciliationReport = {
  companyId: string
  ledgerAccountId: string
  periodStart: string
  periodEnd: string
  rows: Array<BankReconciliationRow>
  matchedCount: number
  unmatchedStatementCount: number
  unmatchedBookCount: number
}

export interface BankReconciliationRepository {
  createStatement: (
    statement: BankStatementRecord,
    lines: Array<BankStatementLineRecord>,
  ) => Promise<BankStatementRecord>
  listStatementsByCompany: (
    companyId: string,
  ) => Promise<Array<BankStatementRecord>>
  listStatementLines: (
    companyId: string,
    statementId: string,
  ) => Promise<Array<BankStatementLineRecord>>
  listMatchesByCompany: (
    companyId: string,
  ) => Promise<Array<BankReconciliationMatchRecord>>
  createMatch: (
    match: BankReconciliationMatchRecord,
  ) => Promise<BankReconciliationMatchRecord>
  deleteMatch: (companyId: string, matchId: string) => Promise<void>
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function amountsEqual(left: string, right: string) {
  return new Decimal(left).minus(new Decimal(right)).abs().lte('0.01')
}

export function listBookBankLines(
  deps: {
    postings: LedgerPostingRepository
    ledgers: LedgerAccountRepository
  },
  companyId: string,
  ledgerAccountId: string,
  period: { startDate: string; endDate: string },
): Promise<Array<BookBankLine>> {
  return deps.postings.listByCompanyId(companyId).then((entries) => {
    const lines: Array<BookBankLine> = []

    for (const entry of entries) {
      if (
        entry.entryDate < period.startDate ||
        entry.entryDate > period.endDate
      ) {
        continue
      }

      for (const line of entry.lines) {
        if (line.ledgerAccountId !== ledgerAccountId) continue

        lines.push({
          entryId: entry.id,
          entryDate: entry.entryDate,
          narration: entry.narration,
          voucherType: entry.voucherType,
          ledgerAccountId: line.ledgerAccountId,
          debit: line.debit,
          credit: line.credit,
        })
      }
    }

    return lines.sort((left, right) =>
      left.entryDate.localeCompare(right.entryDate),
    )
  })
}

function statementBookAmountsMatch(
  statementLine: Pick<BankStatementLineRecord, 'debit' | 'credit'>,
  bookLine: Pick<BookBankLine, 'debit' | 'credit'>,
) {
  const statementDebit = new Decimal(statementLine.debit)
  const statementCredit = new Decimal(statementLine.credit)

  if (statementCredit.gt(0)) {
    return amountsEqual(statementCredit.toFixed(2), bookLine.debit)
  }

  if (statementDebit.gt(0)) {
    return amountsEqual(statementDebit.toFixed(2), bookLine.credit)
  }

  return false
}

export function suggestBankMatches(
  statementLines: Array<BankStatementLineRecord>,
  bookLines: Array<BookBankLine>,
  existingMatches: Array<BankReconciliationMatchRecord>,
) {
  const matchedStatementIds = new Set(
    existingMatches.map((match) => match.statementLineId),
  )
  const matchedEntryIds = new Set(
    existingMatches.map((match) => match.ledgerEntryId),
  )

  const suggestions: Array<{ statementLineId: string; ledgerEntryId: string }> =
    []

  for (const statementLine of statementLines) {
    if (matchedStatementIds.has(statementLine.id)) continue

    const candidate = bookLines.find((bookLine) => {
      if (matchedEntryIds.has(bookLine.entryId)) return false
      if (bookLine.entryDate !== statementLine.lineDate) return false
      return statementBookAmountsMatch(statementLine, bookLine)
    })

    if (candidate) {
      suggestions.push({
        statementLineId: statementLine.id,
        ledgerEntryId: candidate.entryId,
      })
      matchedStatementIds.add(statementLine.id)
      matchedEntryIds.add(candidate.entryId)
    }
  }

  return suggestions
}

export async function importBankStatement(
  repository: BankReconciliationRepository,
  input: {
    companyId: string
    ledgerAccountId: string
    periodStart: string
    periodEnd: string
    sourceFilename: string
    importedByUserId: string
    lines: Array<ParsedBankStatementLine>
  },
) {
  const statementId = crypto.randomUUID()
  const importedAt = new Date()

  const statement: BankStatementRecord = {
    id: statementId,
    companyId: input.companyId,
    ledgerAccountId: input.ledgerAccountId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    sourceFilename: input.sourceFilename,
    importedAt,
    importedByUserId: input.importedByUserId,
  }

  const lineRecords = input.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    companyId: input.companyId,
    statementId,
    ledgerAccountId: input.ledgerAccountId,
  }))

  return repository.createStatement(statement, lineRecords)
}

export async function buildBankReconciliationReport(
  deps: {
    repository: BankReconciliationRepository
    postings: LedgerPostingRepository
    ledgers: LedgerAccountRepository
  },
  input: {
    companyId: string
    ledgerAccountId: string
    periodStart: string
    periodEnd: string
    statementId?: string
  },
): Promise<BankReconciliationReport> {
  const [statements, matches] = await Promise.all([
    deps.repository.listStatementsByCompany(input.companyId),
    deps.repository.listMatchesByCompany(input.companyId),
  ])

  const statement = input.statementId
    ? statements.find((entry) => entry.id === input.statementId)
    : statements
        .filter((entry) => entry.ledgerAccountId === input.ledgerAccountId)
        .sort((left, right) => right.importedAt.getTime() - left.importedAt.getTime())[0]

  const statementLines = statement
    ? await deps.repository.listStatementLines(input.companyId, statement.id)
    : []

  const bookLines = await listBookBankLines(
    deps,
    input.companyId,
    input.ledgerAccountId,
    {
      startDate: input.periodStart,
      endDate: input.periodEnd,
    },
  )

  const matchByStatementId = new Map(
    matches.map((match) => [match.statementLineId, match]),
  )
  const matchByEntryId = new Map(
    matches.map((match) => [match.ledgerEntryId, match]),
  )

  const rows: Array<BankReconciliationRow> = []
  const consumedBookEntryIds = new Set<string>()

  for (const statementLine of statementLines) {
    const match = matchByStatementId.get(statementLine.id)
    const bookLine = match
      ? bookLines.find((line) => line.entryId === match.ledgerEntryId)
      : null

    if (bookLine) {
      consumedBookEntryIds.add(bookLine.entryId)
    }

    rows.push({
      statementLineId: statementLine.id,
      statementDate: statementLine.lineDate,
      statementDescription: statementLine.description,
      statementDebit: statementLine.debit,
      statementCredit: statementLine.credit,
      bookEntryId: bookLine?.entryId ?? null,
      bookDate: bookLine?.entryDate ?? null,
      bookNarration: bookLine?.narration ?? null,
      bookDebit: bookLine?.debit ?? null,
      bookCredit: bookLine?.credit ?? null,
      status: match && bookLine ? 'matched' : 'unmatched_statement',
      matchId: match?.id ?? null,
    })
  }

  for (const bookLine of bookLines) {
    if (consumedBookEntryIds.has(bookLine.entryId)) continue
    if (matchByEntryId.has(bookLine.entryId)) continue

    rows.push({
      statementLineId: null,
      statementDate: null,
      statementDescription: null,
      statementDebit: null,
      statementCredit: null,
      bookEntryId: bookLine.entryId,
      bookDate: bookLine.entryDate,
      bookNarration: bookLine.narration,
      bookDebit: bookLine.debit,
      bookCredit: bookLine.credit,
      status: 'unmatched_book',
      matchId: null,
    })
  }

  rows.sort((left, right) => {
    const leftDate = left.statementDate ?? left.bookDate ?? ''
    const rightDate = right.statementDate ?? right.bookDate ?? ''
    return leftDate.localeCompare(rightDate)
  })

  return {
    companyId: input.companyId,
    ledgerAccountId: input.ledgerAccountId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    rows,
    matchedCount: rows.filter((row) => row.status === 'matched').length,
    unmatchedStatementCount: rows.filter(
      (row) => row.status === 'unmatched_statement',
    ).length,
    unmatchedBookCount: rows.filter((row) => row.status === 'unmatched_book')
      .length,
  }
}

export async function confirmBankMatch(
  repository: BankReconciliationRepository,
  input: {
    companyId: string
    statementLineId: string
    ledgerEntryId: string
    matchedByUserId: string
  },
) {
  return repository.createMatch({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    statementLineId: input.statementLineId,
    ledgerEntryId: input.ledgerEntryId,
    matchedAt: new Date(),
    matchedByUserId: input.matchedByUserId,
  })
}

export async function autoMatchBankStatement(
  repository: BankReconciliationRepository,
  deps: {
    postings: LedgerPostingRepository
    ledgers: LedgerAccountRepository
  },
  input: {
    companyId: string
    ledgerAccountId: string
    statementId: string
    periodStart: string
    periodEnd: string
    matchedByUserId: string
  },
) {
  const [statementLines, matches, bookLines] = await Promise.all([
    repository.listStatementLines(input.companyId, input.statementId),
    repository.listMatchesByCompany(input.companyId),
    listBookBankLines(deps, input.companyId, input.ledgerAccountId, {
      startDate: input.periodStart,
      endDate: input.periodEnd,
    }),
  ])

  const suggestions = suggestBankMatches(statementLines, bookLines, matches)
  const created: Array<BankReconciliationMatchRecord> = []

  for (const suggestion of suggestions) {
    created.push(
      await confirmBankMatch(repository, {
        companyId: input.companyId,
        statementLineId: suggestion.statementLineId,
        ledgerEntryId: suggestion.ledgerEntryId,
        matchedByUserId: input.matchedByUserId,
      }),
    )
  }

  return { matched: created.length, matches: created }
}
