import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

export type DayBookPeriod = {
  startDate: string
  endDate: string
}

export type DayBookEntry = {
  entryId: string
  entryDate: string
  narration: string
  voucherType: string
  totalDebit: string
  totalCredit: string
  lines: Array<{
    ledgerAccountId: string
    debit: string
    credit: string
  }>
}

export type DayBookReport = {
  period: DayBookPeriod
  entries: Array<DayBookEntry>
}

export async function buildDayBook(
  postings: LedgerPostingRepository,
  companyId: string,
  period: DayBookPeriod,
): Promise<DayBookReport> {
  const allEntries = await postings.listByCompanyId(companyId)
  const entries = allEntries
    .filter(
      (entry) =>
        entry.entryDate >= period.startDate &&
        entry.entryDate <= period.endDate,
    )
    .sort((left, right) => left.entryDate.localeCompare(right.entryDate))
    .map((entry) => ({
      entryId: entry.id,
      entryDate: entry.entryDate,
      narration: entry.narration,
      voucherType: entry.voucherType,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      lines: entry.lines.map((line) => ({
        ledgerAccountId: line.ledgerAccountId,
        debit: line.debit,
        credit: line.credit,
      })),
    }))

  return { period, entries }
}
