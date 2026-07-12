import { describe, expect, test } from 'vitest'

import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { createCompaniesRouter } from '#/features/companies/company-router.ts'
import { InMemoryCompanyRepository } from '#/features/companies/company-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { InMemoryMembershipRepository } from '#/features/companies/membership-store.ts'
import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { TRPCContext } from '#/integrations/trpc/init.ts'

const testContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
})

const appRouter = () => {
  const companies = new InMemoryCompanyRepository()
  const ledgers = new InMemoryLedgerAccountRepository()
  const financialYears = new InMemoryFinancialYearRepository()
  const memberships = new InMemoryMembershipRepository()
  const audit = new InMemoryAuditLogRepository()
  const godowns = new InMemoryGodownRepository()

  return createTRPCRouter({
    companies: createCompaniesRouter({
      companies,
      ledgers,
      financialYears,
      memberships,
      audit,
      godowns,
    }),
  })
}

describe('companies router', () => {
  test('creates a company with setup and normalized GSTIN data', async () => {
    const caller = appRouter().createCaller(testContext(crypto.randomUUID()))

    const result = await caller.companies.createWithSetup({
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27abcde1234f1z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    expect(result.company.gstin).toBe('27ABCDE1234F1Z5')
    expect(result.company.tradeName).toBe('Shaban Textiles')
    expect(result.company.id).toBeTruthy()
    expect(result.membership.role).toBe('owner')
    expect(result.ledgerAccounts.length).toBeGreaterThan(0)
  })

  test('lists only companies the signed-in user belongs to', async () => {
    const router = appRouter()
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()

    await router.createCaller(testContext(userA)).companies.createWithSetup({
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    await router.createCaller(testContext(userB)).companies.createWithSetup({
      legalName: 'Noor Trading Private Limited',
      tradeName: 'Noor Trading',
      gstin: '24ABCDE1234F1Z5',
      stateCode: '24',
      financialYearStart: '2026-04-01',
      businessType: 'trading',
    })

    const companies = await router
      .createCaller(testContext(userA))
      .companies.list()

    expect(companies).toHaveLength(1)
    expect(companies[0]?.tradeName).toBe('Shaban Textiles')
  })
})
