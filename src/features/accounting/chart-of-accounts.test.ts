import { describe, expect, test } from 'vitest'

import {
  ChartAlreadySetupError,
  ensureSystemLedgers,
  setupDefaultChartOfAccounts,
} from '#/features/accounting/chart-of-accounts.ts'
import type {
  LedgerAccountRecord,
  LedgerAccountRepository,
} from '#/features/accounting/chart-of-accounts.ts'

class InMemoryLedgerAccountRepository implements LedgerAccountRepository {
  private accounts: Array<LedgerAccountRecord> = []

  async listByCompanyId(companyId: string) {
    return this.accounts.filter((account) => account.companyId === companyId)
  }

  async createMany(accounts: Array<LedgerAccountRecord>) {
    this.accounts.push(...accounts)
    return accounts
  }

  list() {
    return this.accounts
  }
}

const tradingRequiredNames = [
  'Sales',
  'Purchase',
  'Cash',
  'Bank',
  'Customer Receivable',
  'Supplier Payable',
  'Input GST',
  'Output GST',
  'Stock In Hand',
  'Expenses',
  'Cost of Goods Sold',
  'Opening Balance',
] as const

describe('setupDefaultChartOfAccounts', () => {
  test('creates default ledgers for a trading company', async () => {
    const repository = new InMemoryLedgerAccountRepository()

    const accounts = await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-1',
      businessType: 'trading',
    })

    const names = accounts.map((account) => account.name)

    for (const requiredName of tradingRequiredNames) {
      expect(names).toContain(requiredName)
    }

    expect(accounts.every((account) => account.companyId === 'company-1')).toBe(
      true,
    )
    expect(accounts.every((account) => account.isSystem)).toBe(true)
    expect(repository.list()).toHaveLength(accounts.length)
  })

  test('creates a service company chart without stock ledgers by default', async () => {
    const repository = new InMemoryLedgerAccountRepository()

    const accounts = await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-2',
      businessType: 'services',
    })

    const names = accounts.map((account) => account.name)

    expect(names).toContain('Sales')
    expect(names).toContain('Cash')
    expect(names).toContain('Bank')
    expect(names).toContain('Customer Receivable')
    expect(names).toContain('Supplier Payable')
    expect(names).toContain('Input GST')
    expect(names).toContain('Output GST')
    expect(names).toContain('Expenses')
    expect(names).not.toContain('Stock In Hand')
    expect(names).not.toContain('Purchase')
  })

  test('rejects setting up chart of accounts twice for the same company', async () => {
    const repository = new InMemoryLedgerAccountRepository()

    await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })

    await expect(
      setupDefaultChartOfAccounts(repository, {
        companyId: 'company-1',
        businessType: 'wholesale',
      }),
    ).rejects.toBeInstanceOf(ChartAlreadySetupError)
  })

  test('keeps ledger accounts isolated by company', async () => {
    const repository = new InMemoryLedgerAccountRepository()

    await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-1',
      businessType: 'trading',
    })

    await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-2',
      businessType: 'retail',
    })

    const companyOne = await repository.listByCompanyId('company-1')
    const companyTwo = await repository.listByCompanyId('company-2')

    expect(
      companyOne.every((account) => account.companyId === 'company-1'),
    ).toBe(true)
    expect(
      companyTwo.every((account) => account.companyId === 'company-2'),
    ).toBe(true)
    expect(companyOne).toHaveLength(tradingRequiredNames.length)
    expect(companyTwo).toHaveLength(tradingRequiredNames.length)
  })
})

describe('ensureSystemLedgers', () => {
  test('adds system ledgers an existing company is missing', async () => {
    const repository = new InMemoryLedgerAccountRepository()
    const existing = await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })
    // A company set up before the Opening Balance ledger existed.
    const legacy = new InMemoryLedgerAccountRepository()
    await legacy.createMany(
      existing.filter((account) => account.systemKey !== 'opening_balance'),
    )

    const accounts = await ensureSystemLedgers(legacy, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })

    const opening = accounts.find(
      (account) => account.systemKey === 'opening_balance',
    )
    expect(opening).toMatchObject({
      name: 'Opening Balance',
      accountType: 'equity',
      code: '3000',
      isSystem: true,
    })
    expect(legacy.list()).toHaveLength(existing.length)
  })

  test('is a no-op when every system ledger exists', async () => {
    const repository = new InMemoryLedgerAccountRepository()
    const existing = await setupDefaultChartOfAccounts(repository, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })

    const accounts = await ensureSystemLedgers(repository, {
      companyId: 'company-1',
      businessType: 'wholesale',
    })

    expect(accounts).toHaveLength(existing.length)
    expect(repository.list()).toHaveLength(existing.length)
  })

  test('picks a free code when a user ledger already uses the default', async () => {
    const repository = new InMemoryLedgerAccountRepository()
    await repository.createMany([
      {
        id: 'user-ledger',
        companyId: 'company-1',
        code: '3000',
        name: 'Partner Capital',
        accountType: 'equity',
        systemKey: null,
        isSystem: false,
        createdAt: new Date(),
      },
    ])

    const accounts = await ensureSystemLedgers(repository, {
      companyId: 'company-1',
      businessType: 'services',
    })

    expect(
      accounts.find((account) => account.systemKey === 'opening_balance')?.code,
    ).toBe('3001')
  })
})
