import { describe, expect, test } from 'vitest'

import { buildCashBook } from '#/features/accounting/cash-book-service.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

describe('buildCashBook', () => {
  test('filters cash and bank account lines in period', async () => {
    const ledgers = new InMemoryLedgerAccountRepository()
    const postings = new InMemoryLedgerPostingRepository()
    const companyId = 'company-1'
    const createdAt = new Date()

    await ledgers.createMany([
      {
        id: 'cash',
        companyId,
        code: '1000',
        name: 'Cash',
        accountType: 'asset',
        systemKey: 'cash',
        isSystem: true,
        createdAt,
      },
      {
        id: 'sales',
        companyId,
        code: '4000',
        name: 'Sales',
        accountType: 'income',
        systemKey: 'sales',
        isSystem: true,
        createdAt,
      },
    ])

    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-04-15',
      narration: 'Cash sale',
      voucherType: 'receipt',
      lines: [
        { ledgerAccountId: 'cash', debit: '500.00', credit: '0.00' },
        { ledgerAccountId: 'sales', debit: '0.00', credit: '500.00' },
      ],
    })

    const report = await buildCashBook(
      { postings, ledgers },
      companyId,
      { startDate: '2026-04-01', endDate: '2026-04-30' },
    )

    expect(report.lines).toHaveLength(1)
    expect(report.lines[0]?.debit).toBe('500.00')
    expect(report.closingBalance).toBe('500.00')
  })
})
