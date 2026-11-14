import { beforeEach, describe, expect, test } from 'vitest'

import {
  InvalidLedgerPeriodError,
  accountLedgerToCsv,
  buildAccountLedger,
} from '#/features/accounting/account-ledger-service.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { LedgerAccountNotFoundError } from '#/features/accounting/ledger-account-guards.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

import type {
  LedgerAccountRecord,
  LedgerAccountType,
} from '#/features/accounting/chart-of-accounts.ts'
import type { VoucherType } from '#/features/accounting/posting-engine.ts'

const companyId = 'company-1'
const otherCompanyId = 'company-2'

function account(
  id: string,
  name: string,
  accountType: LedgerAccountType,
  owner = companyId,
): LedgerAccountRecord {
  return {
    id,
    companyId: owner,
    code: id,
    name,
    accountType,
    systemKey: null,
    isSystem: false,
    createdAt: new Date(),
  }
}

describe('buildAccountLedger', () => {
  let ledgers: InMemoryLedgerAccountRepository
  let postings: InMemoryLedgerPostingRepository

  async function post(
    entryDate: string,
    narration: string,
    voucherType: VoucherType,
    lines: Array<[string, string, string]>,
    owner = companyId,
  ) {
    await postLedgerEntry(postings, {
      companyId: owner,
      entryDate,
      narration,
      voucherType,
      lines: lines.map(([ledgerAccountId, debit, credit]) => ({
        ledgerAccountId,
        debit,
        credit,
      })),
    })
  }

  beforeEach(async () => {
    ledgers = new InMemoryLedgerAccountRepository()
    postings = new InMemoryLedgerPostingRepository()
    await ledgers.createMany([
      account('cash', 'Cash', 'asset'),
      account('customer', 'Customer Receivable', 'asset'),
      account('sales', 'Sales', 'income'),
      account('output-gst', 'Output GST', 'liability'),
      account('capital', 'Opening Balance', 'equity'),
      account('rent', 'Rent', 'expense'),
      account('other-cash', 'Cash', 'asset', otherCompanyId),
    ])
  })

  test('carries earlier postings forward as the opening balance', async () => {
    await post('2026-03-31', 'Opening cash', 'journal', [
      ['cash', '10000.00', '0.00'],
      ['capital', '0.00', '10000.00'],
    ])
    await post('2026-04-05', 'Cash sale', 'receipt', [
      ['cash', '500.00', '0.00'],
      ['sales', '0.00', '500.00'],
    ])
    await post('2026-04-10', 'Rent paid', 'payment', [
      ['rent', '2000.00', '0.00'],
      ['cash', '0.00', '2000.00'],
    ])
    await post('2026-05-01', 'After the range', 'receipt', [
      ['cash', '999.00', '0.00'],
      ['sales', '0.00', '999.00'],
    ])

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'cash',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(ledger.account.name).toBe('Cash')
    expect(ledger.naturalSide).toBe('Dr')
    expect(ledger.openingBalance).toEqual({ amount: '10000.00', side: 'Dr' })
    expect(
      ledger.rows.map((row) => [
        row.entryDate,
        row.voucherType,
        row.narration,
        row.debit,
        row.credit,
        row.balance,
      ]),
    ).toEqual([
      [
        '2026-04-05',
        'receipt',
        'Cash sale',
        '500.00',
        '0.00',
        { amount: '10500.00', side: 'Dr' },
      ],
      [
        '2026-04-10',
        'payment',
        'Rent paid',
        '0.00',
        '2000.00',
        { amount: '8500.00', side: 'Dr' },
      ],
    ])
    expect(ledger.totalDebit).toBe('500.00')
    expect(ledger.totalCredit).toBe('2000.00')
    expect(ledger.closingBalance).toEqual({ amount: '8500.00', side: 'Dr' })
  })

  test('shows credit-nature accounts with a Cr balance', async () => {
    await post('2026-04-02', 'Invoice INV-1', 'sales', [
      ['customer', '1180.00', '0.00'],
      ['sales', '0.00', '1000.00'],
      ['output-gst', '0.00', '180.00'],
    ])
    await post('2026-04-03', 'Invoice INV-2', 'sales', [
      ['customer', '590.00', '0.00'],
      ['sales', '0.00', '500.00'],
      ['output-gst', '0.00', '90.00'],
    ])

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'output-gst',
        from: '2026-04-01',
        to: '2027-03-31',
      },
    )

    expect(ledger.naturalSide).toBe('Cr')
    expect(ledger.openingBalance).toEqual({ amount: '0.00', side: 'Cr' })
    expect(ledger.rows.map((row) => row.balance)).toEqual([
      { amount: '180.00', side: 'Cr' },
      { amount: '270.00', side: 'Cr' },
    ])
    expect(ledger.closingBalance).toEqual({ amount: '270.00', side: 'Cr' })
  })

  test('marks a debit-nature account that goes negative as Cr', async () => {
    await post('2026-04-02', 'Overdrawn', 'payment', [
      ['rent', '300.00', '0.00'],
      ['cash', '0.00', '300.00'],
    ])

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'cash',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(ledger.closingBalance).toEqual({ amount: '300.00', side: 'Cr' })
  })

  test('names the opposite-side accounts of a multi-line entry', async () => {
    await post('2026-04-02', 'Invoice INV-1', 'sales', [
      ['customer', '1180.00', '0.00'],
      ['sales', '0.00', '1000.00'],
      ['output-gst', '0.00', '180.00'],
    ])

    const customer = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'customer',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )
    const sales = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'sales',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(customer.rows[0].counterAccounts).toEqual([
      { id: 'sales', name: 'Sales' },
      { id: 'output-gst', name: 'Output GST' },
    ])
    expect(sales.rows[0].counterAccounts).toEqual([
      { id: 'customer', name: 'Customer Receivable' },
    ])
    expect(sales.rows[0].credit).toBe('1000.00')
  })

  test('returns the opening balance as the closing balance for an empty range', async () => {
    await post('2026-03-15', 'Old receipt', 'receipt', [
      ['cash', '750.00', '0.00'],
      ['sales', '0.00', '750.00'],
    ])

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'cash',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(ledger.rows).toEqual([])
    expect(ledger.totalDebit).toBe('0.00')
    expect(ledger.totalCredit).toBe('0.00')
    expect(ledger.openingBalance).toEqual({ amount: '750.00', side: 'Dr' })
    expect(ledger.closingBalance).toEqual({ amount: '750.00', side: 'Dr' })
  })

  test('ignores postings of other companies', async () => {
    await post(
      '2026-04-02',
      'Other company sale',
      'receipt',
      [
        ['cash', '400.00', '0.00'],
        ['sales', '0.00', '400.00'],
      ],
      otherCompanyId,
    )

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'cash',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(ledger.rows).toEqual([])
    await expect(
      buildAccountLedger(
        { ledgers, postings },
        {
          companyId,
          ledgerAccountId: 'other-cash',
          from: '2026-04-01',
          to: '2026-04-30',
        },
      ),
    ).rejects.toBeInstanceOf(LedgerAccountNotFoundError)
  })

  test('rejects a start date after the end date', async () => {
    await expect(
      buildAccountLedger(
        { ledgers, postings },
        {
          companyId,
          ledgerAccountId: 'cash',
          from: '2026-05-01',
          to: '2026-04-01',
        },
      ),
    ).rejects.toBeInstanceOf(InvalidLedgerPeriodError)
  })

  test('exports the statement as CSV with opening and closing rows', async () => {
    await post('2026-04-02', 'Sale, "walk-in"', 'receipt', [
      ['cash', '500.00', '0.00'],
      ['sales', '0.00', '500.00'],
    ])

    const ledger = await buildAccountLedger(
      { ledgers, postings },
      {
        companyId,
        ledgerAccountId: 'cash',
        from: '2026-04-01',
        to: '2026-04-30',
      },
    )

    expect(accountLedgerToCsv(ledger).split('\r\n')).toEqual([
      'Date,Voucher type,Particulars,Narration,Debit,Credit,Balance',
      '2026-04-01,,Opening balance,,,,0.00 Dr',
      '2026-04-02,Receipt,Sales,"Sale, ""walk-in""",500.00,0.00,500.00 Dr',
      ',,Total,,500.00,0.00,',
      '2026-04-30,,Closing balance,,,,500.00 Dr',
    ])
  })
})
