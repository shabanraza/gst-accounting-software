import { z } from 'zod'

import {
  listLedgerAccountsByCompany,
  setupDefaultChartOfAccounts,
} from '#/features/accounting/chart-of-accounts.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'

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
  audit: AuditLogRepository,
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
      .mutation(async ({ ctx, input }) => {
        const entry = await postLedgerEntry(ledgerPostingRepository, input)
        await recordDocumentEvent(audit, {
          companyId: entry.companyId,
          actorUserId: ctx.userId,
          action: `${entry.voucherType}_voucher.posted`,
          entityType: 'ledger_entry',
          entityId: entry.id,
          documentNumber: entry.narration,
          amount: entry.totalDebit,
        })
        return entry
      }),
  }) satisfies TRPCRouterRecord
