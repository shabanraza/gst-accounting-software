import { describe, expect, test } from 'vitest'

import { parseBankStatementCsv } from '#/features/banking/bank-statement-parser.ts'
import {
  autoMatchBankStatement,
  buildBankReconciliationReport,
  importBankStatement,
  suggestBankMatches,
  type BookBankLine,
} from '#/features/banking/bank-reconciliation-service.ts'
import { InMemoryBankReconciliationRepository } from '#/features/banking/bank-reconciliation-store.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'

const companyId = '00000000-0000-4000-8000-000000000099'
const bankAccountId = '00000000-0000-4000-8000-000000000010'

describe('parseBankStatementCsv', () => {
  test('parses debit and credit columns', () => {
    const rows = parseBankStatementCsv(`Date,Description,Debit,Credit
14/07/2026,NEFT IN,,5000.00
15/07/2026,UPI OUT,1200.00,`)

    expect(rows).toEqual([
      {
        lineDate: '2026-07-14',
        description: 'NEFT IN',
        reference: '',
        debit: '0.00',
        credit: '5000.00',
      },
      {
        lineDate: '2026-07-15',
        description: 'UPI OUT',
        reference: '',
        debit: '1200.00',
        credit: '0.00',
      },
    ])
  })
})

describe('bank reconciliation', () => {
  test('auto-matches statement deposit to book receipt on same date and amount', async () => {
    const repository = new InMemoryBankReconciliationRepository()
    const ledgers = new InMemoryLedgerAccountRepository()
    const postings = new InMemoryLedgerPostingRepository()

    await ledgers.createMany([
      {
        id: bankAccountId,
        companyId,
        code: '1010',
        name: 'Bank',
        accountType: 'asset',
        systemKey: 'bank',
        isSystem: true,
        createdAt: new Date(),
      },
    ])

    const entryId = crypto.randomUUID()
    await postings.createEntry({
      id: entryId,
      companyId,
      entryDate: '2026-07-14',
      narration: 'Customer receipt',
      voucherType: 'receipt',
      totalDebit: '5000.00',
      totalCredit: '5000.00',
      createdAt: new Date(),
      lines: [
        {
          id: crypto.randomUUID(),
          companyId,
          entryId,
          ledgerAccountId: bankAccountId,
          debit: '5000.00',
          credit: '0.00',
        },
        {
          id: crypto.randomUUID(),
          companyId,
          entryId,
          ledgerAccountId: crypto.randomUUID(),
          debit: '0.00',
          credit: '5000.00',
        },
      ],
    })

    const statement = await importBankStatement(repository, {
      companyId,
      ledgerAccountId: bankAccountId,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      sourceFilename: 'july.csv',
      importedByUserId: 'user-1',
      lines: [
        {
          lineDate: '2026-07-14',
          description: 'NEFT IN',
          reference: 'UTR123',
          debit: '0.00',
          credit: '5000.00',
        },
      ],
    })

    const result = await autoMatchBankStatement(
      repository,
      { postings, ledgers },
      {
        companyId,
        ledgerAccountId: bankAccountId,
        statementId: statement.id,
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        matchedByUserId: 'user-1',
      },
    )

    expect(result.matched).toBe(1)

    const report = await buildBankReconciliationReport(
      { repository, postings, ledgers },
      {
        companyId,
        ledgerAccountId: bankAccountId,
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        statementId: statement.id,
      },
    )

    expect(report.matchedCount).toBe(1)
    expect(report.unmatchedStatementCount).toBe(0)
    expect(report.unmatchedBookCount).toBe(0)
  })

  test('suggestBankMatches ignores already matched lines', () => {
    const statementLines = [
      {
        id: 's1',
        companyId,
        statementId: 'st1',
        ledgerAccountId: bankAccountId,
        lineDate: '2026-07-14',
        description: 'Deposit',
        reference: '',
        debit: '0.00',
        credit: '100.00',
      },
    ]

    const bookLines: Array<BookBankLine> = [
      {
        entryId: 'e1',
        entryDate: '2026-07-14',
        narration: 'Receipt',
        voucherType: 'receipt',
        ledgerAccountId: bankAccountId,
        debit: '100.00',
        credit: '0.00',
      },
    ]

    const suggestions = suggestBankMatches(statementLines, bookLines, [
      {
        id: 'm1',
        companyId,
        statementLineId: 's1',
        ledgerEntryId: 'e1',
        matchedAt: new Date(),
        matchedByUserId: 'user-1',
      },
    ])

    expect(suggestions).toEqual([])
  })
})
