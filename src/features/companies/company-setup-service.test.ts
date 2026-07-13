import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { createCompanyWithSetup } from '#/features/companies/company-setup-service.ts'
import { InMemoryCompanyRepository } from '#/features/companies/company-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { InMemoryMembershipRepository } from '#/features/companies/membership-store.ts'

import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'

describe('createCompanyWithSetup', () => {
  test('creates company, seeds chart of accounts, opens FY, and assigns owner', async () => {
    const companies = new InMemoryCompanyRepository()
    const ledgers = new InMemoryLedgerAccountRepository()
    const financialYears = new InMemoryFinancialYearRepository()
    const memberships = new InMemoryMembershipRepository()
    const audit = new InMemoryAuditLogRepository()
    const godowns = new InMemoryGodownRepository()
    const parties = new InMemoryPartyRepository()
    const items = new InMemoryItemRepository()
    const stock = new InMemoryStockStore()

    const result = await createCompanyWithSetup(
      {
        companies,
        ledgers,
        financialYears,
        memberships,
        audit,
        godowns,
        parties,
        items,
        stock,
      },
      {
        accountId: 'account-1',
        ownerUserId: 'user-1',
        legalName: 'Shaban Textiles Private Limited',
        tradeName: 'Shaban Textiles',
        gstin: '27ABCDE1234F1Z5',
        stateCode: '27',
        financialYearStart: '2026-04-01',
        businessType: 'wholesale',
      },
    )

    expect(result.company.tradeName).toBe('Shaban Textiles')
    expect(result.financialYear.startDate).toBe('2026-04-01')
    expect(result.financialYear.endDate).toBe('2027-03-31')
    expect(result.financialYear.isActive).toBe(true)
    expect(result.membership.role).toBe('owner')
    expect(result.ledgerAccounts.map((account) => account.name)).toContain(
      'Stock In Hand',
    )
    expect(result.starterData.parties.length).toBeGreaterThan(0)
    expect(result.starterData.items.length).toBeGreaterThan(0)

    const accounts = await setupDefaultChartOfAccounts(ledgers, {
      companyId: result.company.id,
      businessType: 'wholesale',
    }).catch((error: Error) => error)

    expect(accounts).toBeInstanceOf(Error)
    expect((accounts as Error).name).toBe('ChartAlreadySetupError')

    const events = audit.list()
    expect(events).toHaveLength(1)
    expect(events[0]?.action).toBe('company.created')
  })
})
