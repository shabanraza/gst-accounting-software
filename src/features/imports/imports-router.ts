import { z } from 'zod'

import { recordMasterEvent } from '#/features/audit/audit-service.ts'
import {
  dryRunImportItems,
  dryRunImportOpeningBalances,
  dryRunImportOpeningStock,
  dryRunImportParties,
} from '#/features/imports/import-dry-run-service.ts'
import {
  commitImportItems,
  commitImportOpeningBalances,
  commitImportOpeningStock,
  commitImportParties,
} from '#/features/imports/import-commit-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { protectedProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { CommitImportResult } from '#/features/imports/import-commit-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'

const partyRowSchema = z.object({
  name: z.string(),
  partyType: z.string(),
  gstin: z.string().nullable(),
  stateCode: z.string(),
})

const stockRowSchema = z.object({
  itemName: z.string(),
  quantity: z.string(),
  unit: z.string(),
  rate: z.string(),
  hsn: z.string().optional(),
  gstRate: z.string().optional(),
})

const itemRowSchema = z.object({
  name: z.string(),
  hsn: z.string(),
  rate: z.string(),
  unit: z.string(),
  gstRate: z.string().optional(),
})

const openingBalanceRowSchema = z.object({
  ledgerCode: z.string(),
  openingDebit: z.string(),
  openingCredit: z.string(),
})

const importLabels = {
  party_import: 'Parties',
  item_import: 'Items',
  opening_stock_import: 'Opening stock',
  opening_balance_import: 'Opening balances',
} as const

/** Records a committed import with its row counts. */
async function recordImport(
  audit: AuditLogRepository,
  kind: keyof typeof importLabels,
  { companyId, actorUserId }: { companyId: string; actorUserId: string },
  result: CommitImportResult,
) {
  await recordMasterEvent(audit, {
    companyId,
    actorUserId,
    action: `${kind}.committed`,
    entityType: 'import',
    entityId: crypto.randomUUID(),
    label: importLabels[kind],
    details: {
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      errorCount: result.errors.length,
    },
  })
  return result
}

export const createImportsRouter = (
  parties: PartyRepository,
  items: ItemRepository,
  ledgers: LedgerAccountRepository,
  postings: LedgerPostingRepository,
  postingTransaction: PostingTransaction,
  audit: AuditLogRepository,
) =>
  ({
    dryRunParties: protectedProcedure
      .input(z.object({ rows: z.array(partyRowSchema) }))
      .mutation(({ input }) => dryRunImportParties(input.rows)),
    commitParties: capabilityProcedure('manage_masters')
      .input(
        z.object({
          companyId: z.string().uuid(),
          rows: z.array(partyRowSchema),
          receivableAccountId: z.string().uuid(),
          payableAccountId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) =>
        recordImport(
          audit,
          'party_import',
          { companyId: input.companyId, actorUserId: ctx.userId },
          await commitImportParties(parties, input),
        ),
      ),
    dryRunOpeningStock: protectedProcedure
      .input(z.object({ rows: z.array(stockRowSchema) }))
      .mutation(({ input }) => dryRunImportOpeningStock(input.rows)),
    commitOpeningStock: capabilityProcedure('manage_inventory')
      .input(
        z.object({
          companyId: z.string().uuid(),
          rows: z.array(stockRowSchema),
          occurredOn: z.string().min(1),
        }),
      )
      .mutation(({ ctx, input }) =>
        postingTransaction(async (tx) =>
          recordImport(
            tx.audit,
            'opening_stock_import',
            { companyId: input.companyId, actorUserId: ctx.userId },
            await commitImportOpeningStock(
              { items: tx.items, stock: tx.stock, posting: tx.posting, ledgers },
              input,
            ),
          ),
        ),
      ),
    dryRunItems: protectedProcedure
      .input(z.object({ rows: z.array(itemRowSchema) }))
      .mutation(({ input }) => dryRunImportItems(input.rows)),
    commitItems: capabilityProcedure('manage_inventory')
      .input(
        z.object({
          companyId: z.string().uuid(),
          rows: z.array(itemRowSchema),
        }),
      )
      .mutation(async ({ ctx, input }) =>
        recordImport(
          audit,
          'item_import',
          { companyId: input.companyId, actorUserId: ctx.userId },
          await commitImportItems(items, input),
        ),
      ),
    dryRunOpeningBalances: protectedProcedure
      .input(z.object({ rows: z.array(openingBalanceRowSchema) }))
      .mutation(({ input }) => dryRunImportOpeningBalances(input.rows)),
    commitOpeningBalances: capabilityProcedure('post_voucher')
      .input(
        z.object({
          companyId: z.string().uuid(),
          entryDate: z.string().min(1),
          rows: z.array(openingBalanceRowSchema),
        }),
      )
      .mutation(async ({ ctx, input }) =>
        recordImport(
          audit,
          'opening_balance_import',
          { companyId: input.companyId, actorUserId: ctx.userId },
          await commitImportOpeningBalances(ledgers, postings, input),
        ),
      ),
  }) satisfies TRPCRouterRecord
