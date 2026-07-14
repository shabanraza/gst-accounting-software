import { z } from 'zod'

import {
  autoMatchBankStatement,
  buildBankReconciliationReport,
  confirmBankMatch,
  importBankStatement,
} from '#/features/banking/bank-reconciliation-service.ts'
import { parseBankStatementCsv } from '#/features/banking/bank-statement-parser.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { BankReconciliationRepository } from '#/features/banking/bank-reconciliation-service.ts'

const periodSchema = z.object({
  companyId: z.string().uuid(),
  ledgerAccountId: z.string().uuid(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  statementId: z.string().uuid().optional(),
})

const importStatementInputSchema = periodSchema.extend({
  sourceFilename: z.string().min(1),
  csvText: z.string().min(1),
})

const matchInputSchema = z.object({
  companyId: z.string().uuid(),
  statementLineId: z.string().uuid(),
  ledgerEntryId: z.string().uuid(),
})

const autoMatchInputSchema = z.object({
  companyId: z.string().uuid(),
  ledgerAccountId: z.string().uuid(),
  statementId: z.string().uuid(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
})

const unmatchInputSchema = z.object({
  companyId: z.string().uuid(),
  matchId: z.string().uuid(),
})

export const createBankingRouter = (
  repository: BankReconciliationRepository,
  postings: LedgerPostingRepository,
  ledgers: LedgerAccountRepository,
) =>
  ({
    getReconciliation: capabilityProcedure('view_reports')
      .input(periodSchema)
      .query(({ input }) => {
        return buildBankReconciliationReport(
          { repository, postings, ledgers },
          input,
        )
      }),
    importStatement: capabilityProcedure('reconcile_bank')
      .input(importStatementInputSchema)
      .mutation(async ({ input, ctx }) => {
        const lines = parseBankStatementCsv(input.csvText)
        return importBankStatement(repository, {
          companyId: input.companyId,
          ledgerAccountId: input.ledgerAccountId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          sourceFilename: input.sourceFilename,
          importedByUserId: ctx.userId,
          lines,
        })
      }),
    autoMatch: capabilityProcedure('reconcile_bank')
      .input(autoMatchInputSchema)
      .mutation(({ input, ctx }) => {
        return autoMatchBankStatement(
          repository,
          { postings, ledgers },
          {
            ...input,
            matchedByUserId: ctx.userId,
          },
        )
      }),
    confirmMatch: capabilityProcedure('reconcile_bank')
      .input(matchInputSchema)
      .mutation(({ input, ctx }) => {
        return confirmBankMatch(repository, {
          ...input,
          matchedByUserId: ctx.userId,
        })
      }),
    unmatch: capabilityProcedure('reconcile_bank')
      .input(unmatchInputSchema)
      .mutation(({ input }) => {
        return repository.deleteMatch(input.companyId, input.matchId)
      }),
    listStatements: capabilityProcedure('view_reports')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(({ input }) => {
        return repository.listStatementsByCompany(input.companyId)
      }),
  }) satisfies TRPCRouterRecord
