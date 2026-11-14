import { beforeEach, describe, expect, test } from 'vitest'

import { createAccountingRouter } from '#/features/accounting/accounting-router.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { TRPCContext } from '#/integrations/trpc/init.ts'

const testContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
})

const createCaller = (userId: string) => {
  const ledgerAccountRepository = new InMemoryLedgerAccountRepository()
  const ledgerPostingRepository = new InMemoryLedgerPostingRepository()
  const router = createTRPCRouter({
    accounting: createAccountingRouter(
      ledgerAccountRepository,
      ledgerPostingRepository,
      membershipRepository,
    ),
  })

  return {
    caller: router.createCaller(testContext(userId)),
    ledgerAccountRepository,
    ledgerPostingRepository,
    membershipRepository,
  }
}

describe('accountingRouter', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })
  test('sets up and lists chart of accounts for a company', async () => {
    const userId = crypto.randomUUID()
    const { caller } = createCaller(userId)
    const companyId = crypto.randomUUID()

    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })

    const created = await caller.accounting.setupChartOfAccounts({
      companyId,
      businessType: 'trading',
    })

    const listed = await caller.accounting.listLedgerAccounts({ companyId })

    expect(created).toHaveLength(12)
    expect(listed).toHaveLength(12)
    expect(listed.map((account) => account.name)).toContain('Stock In Hand')
  })

  test('posts a balanced ledger entry through the router', async () => {
    const userId = crypto.randomUUID()
    const { caller } = createCaller(userId)
    const companyId = crypto.randomUUID()
    const cashId = crypto.randomUUID()
    const salesId = crypto.randomUUID()

    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })

    const entry = await caller.accounting.postLedgerEntry({
      companyId,
      entryDate: '2026-07-11',
      narration: 'Cash sale',
      voucherType: 'journal',
      lines: [
        { ledgerAccountId: cashId, debit: '250.00', credit: '0.00' },
        { ledgerAccountId: salesId, debit: '0.00', credit: '250.00' },
      ],
    })

    expect(entry.totalDebit).toBe('250.00')
    expect(entry.totalCredit).toBe('250.00')
    expect(entry.companyId).toBe(companyId)
  })

  test('rejects posting when the caller lacks a permitted membership role', async () => {
    const userId = crypto.randomUUID()
    const { caller } = createCaller(userId)
    const companyId = crypto.randomUUID()

    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'readonly',
      createdAt: new Date(),
    })

    await expect(
      caller.accounting.postLedgerEntry({
        companyId,
        entryDate: '2026-07-11',
        narration: 'Cash sale',
        voucherType: 'journal',
        lines: [
          {
            ledgerAccountId: crypto.randomUUID(),
            debit: '250.00',
            credit: '0.00',
          },
          {
            ledgerAccountId: crypto.randomUUID(),
            debit: '0.00',
            credit: '250.00',
          },
        ],
      }),
    ).rejects.toThrow()
  })

  test('allows posting when the caller has a permitted membership role', async () => {
    const userId = crypto.randomUUID()
    const { caller } = createCaller(userId)
    const companyId = crypto.randomUUID()

    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'accountant',
      createdAt: new Date(),
    })

    const entry = await caller.accounting.postLedgerEntry({
      companyId,
      entryDate: '2026-07-11',
      narration: 'Cash sale',
      voucherType: 'journal',
      lines: [
        {
          ledgerAccountId: crypto.randomUUID(),
          debit: '250.00',
          credit: '0.00',
        },
        {
          ledgerAccountId: crypto.randomUUID(),
          debit: '0.00',
          credit: '250.00',
        },
      ],
    })

    expect(entry.totalDebit).toBe('250.00')
  })
})

describe('accountingRouter.accountLedger', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  async function setup(role: 'owner' | 'billing') {
    const userId = crypto.randomUUID()
    const companyId = crypto.randomUUID()
    const { caller } = createCaller(userId)
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role,
      createdAt: new Date(),
    })
    return { caller, companyId }
  }

  test('returns the statement for one of the company ledgers', async () => {
    const { caller, companyId } = await setup('owner')
    const accounts = await caller.accounting.setupChartOfAccounts({
      companyId,
      businessType: 'services',
    })
    const cash = accounts.find((account) => account.systemKey === 'cash')
    const sales = accounts.find((account) => account.systemKey === 'sales')
    if (!cash || !sales) throw new Error('default ledgers missing')

    await caller.accounting.postLedgerEntry({
      companyId,
      entryDate: '2026-04-11',
      narration: 'Cash sale',
      voucherType: 'receipt',
      lines: [
        { ledgerAccountId: cash.id, debit: '250.00', credit: '0.00' },
        { ledgerAccountId: sales.id, debit: '0.00', credit: '250.00' },
      ],
    })

    const ledger = await caller.accounting.accountLedger({
      companyId,
      ledgerAccountId: cash.id,
      from: '2026-04-01',
      to: '2027-03-31',
    })

    expect(ledger.rows).toHaveLength(1)
    expect(ledger.rows[0].counterAccounts).toEqual([
      { id: sales.id, name: 'Sales' },
    ])
    expect(ledger.closingBalance).toEqual({ amount: '250.00', side: 'Dr' })
  })

  test('requires the view_reports capability', async () => {
    const { caller, companyId } = await setup('billing')

    await expect(
      caller.accounting.accountLedger({
        companyId,
        ledgerAccountId: crypto.randomUUID(),
        from: '2026-04-01',
        to: '2027-03-31',
      }),
    ).rejects.toThrow(/not permitted/)
  })
})
