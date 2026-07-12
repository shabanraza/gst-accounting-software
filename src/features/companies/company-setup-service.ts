import { recordAuditEvent } from '#/features/audit/audit-service.ts'
import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { createCompany } from '#/features/companies/company-service.ts'
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { assignCompanyMembership } from '#/features/companies/membership-service.ts'

import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type {
  CompanyRecord,
  CompanyRepository,
  CreateCompanyInput,
} from '#/features/companies/company-service.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { MembershipRepository } from '#/features/companies/membership-service.ts'

export type CreateCompanyWithSetupInput = CreateCompanyInput & {
  ownerUserId: string
}

export type CompanySetupDependencies = {
  companies: CompanyRepository
  ledgers: LedgerAccountRepository
  financialYears: FinancialYearRepository
  memberships: MembershipRepository
  audit: AuditLogRepository
}

export async function createCompanyWithSetup(
  deps: CompanySetupDependencies,
  input: CreateCompanyWithSetupInput,
) {
  const company: CompanyRecord = await createCompany(deps.companies, input)

  const [ledgerAccounts, financialYear, membership] = await Promise.all([
    setupDefaultChartOfAccounts(deps.ledgers, {
      companyId: company.id,
      businessType: input.businessType,
    }),
    createFinancialYear(deps.financialYears, {
      companyId: company.id,
      startDate: input.financialYearStart,
      isActive: true,
    }),
    assignCompanyMembership(deps.memberships, {
      companyId: company.id,
      userId: input.ownerUserId,
      role: 'owner',
    }),
  ])

  await recordAuditEvent(deps.audit, {
    companyId: company.id,
    actorUserId: input.ownerUserId,
    action: 'company.created',
    entityType: 'company',
    entityId: company.id,
    metadata: {
      tradeName: company.tradeName,
      businessType: company.businessType,
      financialYearId: financialYear.id,
    },
  })

  return {
    company,
    ledgerAccounts,
    financialYear,
    membership,
  }
}
