import { describe, expect, test } from 'vitest'

import { createAccountingRouter } from '#/features/accounting/accounting-router.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { InMemoryMembershipRepository } from '#/features/companies/membership-store.ts'
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
  const membershipRepository = new InMemoryMembershipRepository()
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
  test('sets up and lists chart of accounts for a company', async () => {
    const { caller } = createCaller(crypto.randomUUID())
    const companyId = crypto.randomUUID()

    const created = await caller.accounting.setupChartOfAccounts({
      companyId,
      businessType: 'trading',
    })

    const listed = await caller.accounting.listLedgerAccounts({ companyId })

    expect(created).toHaveLength(11)
    expect(listed).toHaveLength(11)
    expect(listed.map((account) => account.name)).toContain('Stock In Hand')
  })

  test('posts a balanced ledger entry through the router', async () => {
    const userId = crypto.randomUUID()
    const { caller, membershipRepository } = createCaller(userId)
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
    const { caller, membershipRepository } = createCaller(userId)
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
    const { caller, membershipRepository } = createCaller(userId)
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
