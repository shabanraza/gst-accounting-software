import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  listLedgerAccountsByCompany,
  setupDefaultChartOfAccounts,
} from '#/features/accounting/chart-of-accounts.ts'
import {
  listCompaniesByIds,
  updateCompanyProfile,
} from '#/features/companies/company-service.ts'
import { createFinancialYear } from '#/features/companies/financial-year-service.ts'
import { createCompanyWithSetup } from '#/features/companies/company-setup-service.ts'
import { ensureDefaultGodowns } from '#/features/inventory/godown-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { protectedProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { CompanyRepository } from '#/features/companies/company-service.ts'
import type { CompanySetupDependencies } from '#/features/companies/company-setup-service.ts'

const createCompanyInputSchema = z.object({
  legalName: z.string().min(1),
  tradeName: z.string().min(1),
  gstin: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => value ?? null),
  stateCode: z.string().length(2),
  financialYearStart: z.string().min(1),
  businessType: z.enum([
    'trading',
    'wholesale',
    'retail',
    'manufacturing_light',
    'services',
    'distribution',
    'custom',
  ]),
})

const ensureWorkspaceInputSchema = z.object({
  preferredCompanyId: z.string().uuid().optional(),
})

const updateProfileInputSchema = z.object({
  companyId: z.string().uuid(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  city: z.string(),
  pincode: z.string(),
  pan: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  bankName: z.string(),
  bankAccountNumber: z.string(),
  bankIfsc: z.string(),
  authorizedSignatory: z.string(),
  logoUrl: z.string(),
})

export type CompaniesRouterDependencies = CompanySetupDependencies

async function listCompaniesForUser(
  deps: CompaniesRouterDependencies,
  userId: string,
) {
  const memberships = await deps.memberships.listByUserId(userId)
  const companyIds = memberships.map((membership) => membership.companyId)
  return listCompaniesByIds(deps.companies, companyIds)
}

export const createCompaniesRouter = (deps: CompaniesRouterDependencies) =>
  ({
    list: protectedProcedure.query(({ ctx }) => {
      return listCompaniesForUser(deps, ctx.userId)
    }),
    updateProfile: capabilityProcedure('manage_company')
      .input(updateProfileInputSchema)
      .mutation(({ input }) => {
        const { companyId, ...profile } = input
        return updateCompanyProfile(deps.companies, companyId, profile)
      }),
    createWithSetup: protectedProcedure
      .input(createCompanyInputSchema)
      .mutation(({ ctx, input }) => {
        const setupDeps: CompanySetupDependencies = deps

        return createCompanyWithSetup(setupDeps, {
          ...input,
          accountId: ctx.userId,
          ownerUserId: ctx.userId,
        })
      }),
    ensureWorkspace: protectedProcedure
      .input(ensureWorkspaceInputSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await listCompaniesForUser(deps, ctx.userId)
        const company =
          (input.preferredCompanyId
            ? existing.find((entry) => entry.id === input.preferredCompanyId)
            : undefined) ?? existing.at(0)

        if (!company) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No company found for this account',
          })
        }

        let ledgers = await listLedgerAccountsByCompany(
          deps.ledgers,
          company.id,
        )
        if (ledgers.length === 0) {
          ledgers = await setupDefaultChartOfAccounts(deps.ledgers, {
            companyId: company.id,
            businessType: company.businessType,
          })
        }

        const ledgerBySystemKey = Object.fromEntries(
          ledgers
            .filter((ledger) => ledger.systemKey)
            .map((ledger) => [ledger.systemKey, ledger.id]),
        ) as Record<string, string>

        const godowns = await ensureDefaultGodowns(deps.godowns, company.id)

        const financialYears = await deps.financialYears.listByCompanyId(
          company.id,
        )
        let activeFinancialYear =
          financialYears.find((entry) => entry.isActive) ?? financialYears.at(0)

        if (!activeFinancialYear) {
          activeFinancialYear = await createFinancialYear(deps.financialYears, {
            companyId: company.id,
            startDate: company.financialYearStart,
            isActive: true,
          })
        }

        return {
          company,
          companies: existing,
          ledgers,
          ledgerBySystemKey,
          godowns,
          activeFinancialYearId: activeFinancialYear.id,
        }
      }),
  }) satisfies TRPCRouterRecord
