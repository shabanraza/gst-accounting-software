import { z } from 'zod'

import {
  listLedgerAccountsByCompany,
  setupDefaultChartOfAccounts,
} from '#/features/accounting/chart-of-accounts.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { assertCapability } from '#/features/companies/membership-service.ts'
import { mutatingProcedure, publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { MembershipRepository } from '#/features/companies/membership-service.ts'

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

export const createAccountingRouter = (
  ledgerAccountRepository: LedgerAccountRepository,
  ledgerPostingRepository: LedgerPostingRepository,
  memberships?: MembershipRepository,
) =>
  ({
    listLedgerAccounts: publicProcedure
      .input(companyIdInputSchema)
      .query(({ input }) => {
        return listLedgerAccountsByCompany(
          ledgerAccountRepository,
          input.companyId,
        )
      }),
    setupChartOfAccounts: mutatingProcedure
      .input(setupChartInputSchema)
      .mutation(({ input }) => {
        return setupDefaultChartOfAccounts(ledgerAccountRepository, input)
      }),
    postLedgerEntry: mutatingProcedure
      .input(postLedgerEntryInputSchema)
      .mutation(async ({ input, ctx }) => {
        if (memberships) {
          await assertCapability(memberships, {
            companyId: input.companyId,
            userId: ctx.userId,
            capability: 'post_voucher',
          })
        }

        return postLedgerEntry(ledgerPostingRepository, input)
      }),
  }) satisfies TRPCRouterRecord
