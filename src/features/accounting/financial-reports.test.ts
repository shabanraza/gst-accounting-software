import { describe, expect, test } from 'vitest'

import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import {
  buildBalanceSheet,
  buildProfitAndLoss,
  buildTrialBalance,
} from '#/features/accounting/financial-reports.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

async function seedAccounts(ledgers: InMemoryLedgerAccountRepository, companyId: string) {
  const createdAt = new Date()
  const [cash, sales, cogs, stock] = await ledgers.createMany([
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
    {
      id: 'cogs',
      companyId,
      code: '5200',
      name: 'Cost of Goods Sold',
      accountType: 'expense',
      systemKey: 'cogs',
      isSystem: true,
      createdAt,
    },
    {
      id: 'stock',
      companyId,
      code: '1300',
      name: 'Stock In Hand',
      accountType: 'asset',
      systemKey: 'stock_in_hand',
      isSystem: true,
      createdAt,
    },
  ])
  return { cash, sales, cogs, stock }
}

describe('buildTrialBalance', () => {
  test('sums debits and credits per account across posted entries', async () => {
    const companyId = 'company-1'
    const ledgers = new InMemoryLedgerAccountRepository()
    const postings = new InMemoryLedgerPostingRepository()
    const { cash, sales } = await seedAccounts(ledgers, companyId)

    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-01-01',
      narration: 'Cash sale',
      voucherType: 'sales',
      lines: [
        { ledgerAccountId: cash.id, debit: '1000.00', credit: '0.00' },
        { ledgerAccountId: sales.id, debit: '0.00', credit: '1000.00' },
      ],
    })

    const report = await buildTrialBalance({ ledgers, postings }, companyId)

    const cashRow = report.rows.find((row) => row.accountId === cash.id)
    const salesRow = report.rows.find((row) => row.accountId === sales.id)

    expect(cashRow?.balance).toBe('1000.00')
    expect(cashRow?.balanceType).toBe('debit')
    expect(salesRow?.balance).toBe('1000.00')
    expect(salesRow?.balanceType).toBe('credit')
    expect(report.totalDebit).toBe(report.totalCredit)
  })
})

describe('buildProfitAndLoss', () => {
  test('computes net profit from income and expense accounts', async () => {
    const companyId = 'company-1'
    const ledgers = new InMemoryLedgerAccountRepository()
    const postings = new InMemoryLedgerPostingRepository()
    const { cash, sales, cogs, stock } = await seedAccounts(ledgers, companyId)

    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-01-01',
      narration: 'Cash sale',
      voucherType: 'sales',
      lines: [
        { ledgerAccountId: cash.id, debit: '1000.00', credit: '0.00' },
        { ledgerAccountId: sales.id, debit: '0.00', credit: '1000.00' },
      ],
    })
    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-01-01',
      narration: 'COGS',
      voucherType: 'sales',
      lines: [
        { ledgerAccountId: cogs.id, debit: '600.00', credit: '0.00' },
        { ledgerAccountId: stock.id, debit: '0.00', credit: '600.00' },
      ],
    })

    const report = await buildProfitAndLoss({ ledgers, postings }, companyId)

    expect(report.totalIncome).toBe('1000.00')
    expect(report.totalExpense).toBe('600.00')
    expect(report.netProfit).toBe('400.00')
  })
})

describe('buildBalanceSheet', () => {
  test('assets equal liabilities plus equity plus retained profit', async () => {
    const companyId = 'company-1'
    const ledgers = new InMemoryLedgerAccountRepository()
    const postings = new InMemoryLedgerPostingRepository()
    const { cash, sales } = await seedAccounts(ledgers, companyId)

    await postLedgerEntry(postings, {
      companyId,
      entryDate: '2026-01-01',
      narration: 'Cash sale',
      voucherType: 'sales',
      lines: [
        { ledgerAccountId: cash.id, debit: '1000.00', credit: '0.00' },
        { ledgerAccountId: sales.id, debit: '0.00', credit: '1000.00' },
      ],
    })

    const report = await buildBalanceSheet({ ledgers, postings }, companyId)

    expect(report.totalAssets).toBe('1000.00')
    expect(report.netProfit).toBe('1000.00')
  })
})
