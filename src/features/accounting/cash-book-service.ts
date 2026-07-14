import Decimal from 'decimal.js'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { DayBookPeriod } from '#/features/accounting/day-book-service.ts'

export type CashBookLine = {
  entryId: string
  entryDate: string
  narration: string
  voucherType: string
  ledgerAccountId: string
  ledgerName: string
  debit: string
  credit: string
}

export type CashBookReport = {
  period: DayBookPeriod
  lines: Array<CashBookLine>
  totalDebit: string
  totalCredit: string
  closingBalance: string
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function buildCashBook(
  deps: {
    postings: LedgerPostingRepository
    ledgers: LedgerAccountRepository
  },
  companyId: string,
  period: DayBookPeriod,
): Promise<CashBookReport> {
  const [entries, accounts] = await Promise.all([
    deps.postings.listByCompanyId(companyId, {
      startDate: period.startDate,
      endDate: period.endDate,
    }),
    deps.ledgers.listByCompanyId(companyId),
  ])

  const cashAccountIds = new Set(
    accounts
      .filter(
        (account) =>
          account.systemKey === 'cash' || account.systemKey === 'bank',
      )
      .map((account) => account.id),
  )
  const accountNameById = new Map(
    accounts.map((account) => [account.id, account.name]),
  )

  const lines: Array<CashBookLine> = []
  let totalDebit = new Decimal(0)
  let totalCredit = new Decimal(0)

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!cashAccountIds.has(line.ledgerAccountId)) continue

      totalDebit = totalDebit.plus(line.debit)
      totalCredit = totalCredit.plus(line.credit)
      lines.push({
        entryId: entry.id,
        entryDate: entry.entryDate,
        narration: entry.narration,
        voucherType: entry.voucherType,
        ledgerAccountId: line.ledgerAccountId,
        ledgerName: accountNameById.get(line.ledgerAccountId) ?? 'Cash/Bank',
        debit: line.debit,
        credit: line.credit,
      })
    }
  }

  lines.sort((left, right) => left.entryDate.localeCompare(right.entryDate))

  return {
    period,
    lines,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closingBalance: totalDebit.minus(totalCredit).toFixed(2),
  }
}
