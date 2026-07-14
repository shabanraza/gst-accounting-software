import { describe, expect, test } from 'vitest'

import {
  UnbalancedLedgerEntryError,
  postLedgerEntry,
} from '#/features/accounting/posting-engine.ts'
import type {
  LedgerEntryRecord,
  LedgerLineInput,
  LedgerPostingRepository,
} from '#/features/accounting/posting-engine.ts'

class InMemoryLedgerPostingRepository implements LedgerPostingRepository {
  private entries: Array<LedgerEntryRecord> = []

  async createEntry(entry: LedgerEntryRecord) {
    this.entries.push(entry)
    return entry
  }

  async listByCompanyId(companyId: string) {
    return this.entries.filter((entry) => entry.companyId === companyId)
  }

  list() {
    return this.entries
  }
}

function balancedLines(): Array<LedgerLineInput> {
  return [
    {
      ledgerAccountId: 'cash',
      debit: '1000.00',
      credit: '0.00',
    },
    {
      ledgerAccountId: 'sales',
      debit: '0.00',
      credit: '1000.00',
    },
  ]
}

describe('postLedgerEntry', () => {
  test('posts a balanced journal entry', async () => {
    const repository = new InMemoryLedgerPostingRepository()

    const entry = await postLedgerEntry(repository, {
      companyId: 'company-1',
      entryDate: '2026-07-11',
      narration: 'Opening cash receipt',
      voucherType: 'journal',
      lines: balancedLines(),
    })

    expect(entry.companyId).toBe('company-1')
    expect(entry.lines).toHaveLength(2)
    expect(entry.totalDebit).toBe('1000.00')
    expect(entry.totalCredit).toBe('1000.00')
    expect(repository.list()).toHaveLength(1)
  })

  test('rejects unbalanced posting', async () => {
    const repository = new InMemoryLedgerPostingRepository()

    await expect(
      postLedgerEntry(repository, {
        companyId: 'company-1',
        entryDate: '2026-07-11',
        narration: 'Broken entry',
        voucherType: 'journal',
        lines: [
          {
            ledgerAccountId: 'cash',
            debit: '1000.00',
            credit: '0.00',
          },
          {
            ledgerAccountId: 'sales',
            debit: '0.00',
            credit: '900.00',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedLedgerEntryError)
  })

  test('requires company_id on every posted entry and line', async () => {
    const repository = new InMemoryLedgerPostingRepository()

    const entry = await postLedgerEntry(repository, {
      companyId: 'company-42',
      entryDate: '2026-07-11',
      narration: 'Company scoped posting',
      voucherType: 'journal',
      lines: balancedLines(),
    })

    expect(entry.companyId).toBe('company-42')
    expect(entry.lines.every((line) => line.companyId === 'company-42')).toBe(
      true,
    )
  })

  test('rejects lines that set both debit and credit', async () => {
    const repository = new InMemoryLedgerPostingRepository()

    await expect(
      postLedgerEntry(repository, {
        companyId: 'company-1',
        entryDate: '2026-07-11',
        narration: 'Invalid line',
        voucherType: 'journal',
        lines: [
          {
            ledgerAccountId: 'cash',
            debit: '500.00',
            credit: '500.00',
          },
          {
            ledgerAccountId: 'bank',
            debit: '0.00',
            credit: '500.00',
          },
        ],
      }),
    ).rejects.toThrow(/debit or credit/i)
  })
})
