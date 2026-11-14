import { z } from 'zod'

import { buildAccountLedger } from '#/features/accounting/account-ledger-service.ts'
import {
  listLedgerAccountsByCompany,
  setupDefaultChartOfAccounts,
} from '#/features/accounting/chart-of-accounts.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

const companyIdInputSchema = z.object({
  companyId: z.string().uuid(),
})

const setupChartInputSchema = z.object({
  companyId: z.string().uuid(),
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

const postLedgerEntryInputSchema = z.object({
  companyId: z.string().uuid(),
  entryDate: z.string().min(1),
  narration: z.string().min(1),
  voucherType: z.enum([
    'journal',
    'payment',
    'receipt',
    'contra',
    'sales',
    'purchase',
  ]),
  lines: z
    .array(
      z.object({
        ledgerAccountId: z.string().uuid(),
        debit: z.string().min(1),
        credit: z.string().min(1),
      }),
    )
    .min(2),
})

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const accountLedgerInputSchema = z.object({
  companyId: z.string().uuid(),
  ledgerAccountId: z.string().uuid(),
  from: calendarDateSchema,
  to: calendarDateSchema,
})

export const createAccountingRouter = (
  ledgerAccountRepository: LedgerAccountRepository,
  ledgerPostingRepository: LedgerPostingRepository,
) =>
  ({
    listLedgerAccounts: capabilityProcedure('view')
      .input(companyIdInputSchema)
      .query(({ input }) => {
        return listLedgerAccountsByCompany(
          ledgerAccountRepository,
          input.companyId,
        )
      }),
    setupChartOfAccounts: capabilityProcedure('manage_masters')
      .input(setupChartInputSchema)
      .mutation(({ input }) => {
        return setupDefaultChartOfAccounts(ledgerAccountRepository, input)
      }),
    postLedgerEntry: capabilityProcedure('post_voucher')
      .input(postLedgerEntryInputSchema)
      .mutation(({ input }) => {
        return postLedgerEntry(ledgerPostingRepository, input)
      }),
    accountLedger: capabilityProcedure('view_reports')
      .input(accountLedgerInputSchema)
      .query(({ input }) => {
        return buildAccountLedger(
          {
            ledgers: ledgerAccountRepository,
            postings: ledgerPostingRepository,
          },
          input,
        )
      }),
  }) satisfies TRPCRouterRecord
