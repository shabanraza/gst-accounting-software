import { describe, expect, test } from 'vitest'

import { buildDayBook } from '#/features/accounting/day-book-service.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

describe('buildDayBook', () => {
  test('returns ledger entries in date range with lines', async () => {
    const postings = new InMemoryLedgerPostingRepository()
    const companyId = 'company-1'

    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-04-10',
      narration: 'April entry',
      voucherType: 'journal',
      lines: [
        { ledgerAccountId: 'cash', debit: '100.00', credit: '0.00' },
        { ledgerAccountId: 'sales', debit: '0.00', credit: '100.00' },
      ],
    })
    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-05-01',
      narration: 'May entry',
      voucherType: 'payment',
      lines: [
        { ledgerAccountId: 'cash', debit: '0.00', credit: '50.00' },
        { ledgerAccountId: 'expenses', debit: '50.00', credit: '0.00' },
      ],
    })

    const report = await buildDayBook(postings, companyId, {
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    })

    expect(report.entries).toHaveLength(1)
    expect(report.entries[0]?.narration).toBe('April entry')
    expect(report.entries[0]?.lines).toHaveLength(2)
  })
})
