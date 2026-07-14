import { z } from 'zod'

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
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
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
})

const itemRowSchema = z.object({
  name: z.string(),
  hsn: z.string(),
  rate: z.string(),
  unit: z.string(),
})

const openingBalanceRowSchema = z.object({
  ledgerCode: z.string(),
  openingDebit: z.string(),
  openingCredit: z.string(),
})

export const createImportsRouter = (
  parties: PartyRepository,
  items: ItemRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  ledgers: LedgerAccountRepository,
  postings: LedgerPostingRepository,
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
      .mutation(({ input }) => commitImportParties(parties, input)),
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
      .mutation(({ input }) => commitImportOpeningStock(items, stock, input)),
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
      .mutation(({ input }) => commitImportItems(items, input)),
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
      .mutation(({ input }) =>
        commitImportOpeningBalances(ledgers, postings, input),
      ),
  }) satisfies TRPCRouterRecord
