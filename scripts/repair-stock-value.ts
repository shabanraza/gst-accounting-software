#!/usr/bin/env bun
/**
 * One-time, idempotent repair after migration 0011 (stock value columns).
 *
 * For each company it:
 *   1. adds missing system ledgers (Opening Balance),
 *   2. posts Dr Stock In Hand / Cr Opening Balance for user-entered opening
 *      stock that never reached the ledger, at the item purchase rate
 *      (unpriced items are only reported — no rate is invented),
 *   3. values legacy stock balances at quantity × item purchase rate,
 *   4. reports, and posts, a Stock In Hand ↔ COGS reconciliation so the balance
 *      sheet equals the stock valuation.
 *
 * Seeded starter stock, and openings of exactly 100 created before
 * --legacy-before (the old invented default), are never posted. They are
 * listed for owner review or removal; their items stay unvalued and that
 * company gets no reconciliation, so its books keep differing from the stock
 * valuation until the phantom stock is removed.
 *
 * Every write runs in one transaction per company. Without --apply the
 * transaction is rolled back, so the default run is a report. Rerunning after
 * --apply finds nothing left to do.
 *
 * Reads REPAIR_DATABASE_URL (never DATABASE_URL) so it cannot hit the app's
 * configured database by accident. Point it at a Neon branch, never production.
 *
 *   REPAIR_DATABASE_URL=... bun scripts/repair-stock-value.ts --legacy-before <YYYY-MM-DD>
 *     [--company <id>] [--apply]
 */
import { Pool } from '@neondatabase/serverless'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from '#/db/schema.ts'
import { ensureSystemLedgers } from '#/features/accounting/chart-of-accounts.ts'
import { DrizzleLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { DrizzleLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { planStockValueRepair } from '#/features/inventory/stock-value-repair.ts'

import type { AppDatabase } from '#/db/client.ts'
import type { BusinessType } from '#/features/companies/company-service.ts'

const connectionString = process.env.REPAIR_DATABASE_URL
if (!connectionString) {
  console.error('REPAIR_DATABASE_URL is not set. Use a Neon branch URL.')
  process.exit(1)
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const companyFlag = args.indexOf('--company')
const onlyCompanyId = companyFlag === -1 ? null : args[companyFlag + 1]
const legacyFlag = args.indexOf('--legacy-before')
const legacyBefore = legacyFlag === -1 ? '' : (args[legacyFlag + 1] ?? '')
if (!/^\d{4}-\d{2}-\d{2}$/.test(legacyBefore)) {
  console.error(
    '--legacy-before YYYY-MM-DD is required: the day the build that stopped inventing opening stock went live.',
  )
  process.exit(1)
}

class DryRunRollback extends Error {}

async function repairCompany(
  tx: AppDatabase,
  company: { id: string; tradeName: string; businessType: string },
) {
  const accounts = await ensureSystemLedgers(
    new DrizzleLedgerAccountRepository(tx),
    {
      companyId: company.id,
      businessType: company.businessType as BusinessType,
    },
  )
  const accountId = (key: string) =>
    accounts.find((account) => account.systemKey === key)?.id
  const stockAccountId = accountId('stock_in_hand')
  if (!stockAccountId) {
    console.log(`  no Stock In Hand ledger (services company) — skipped`)
    return
  }

  const items = await tx
    .select({
      id: schema.items.id,
      name: schema.items.name,
      purchaseRate: schema.items.purchaseRate,
    })
    .from(schema.items)
    .where(eq(schema.items.companyId, company.id))
  const unvaluedOpenings = await tx
    .select({
      movementId: schema.stockMovements.id,
      itemId: schema.stockMovements.itemId,
      quantity: schema.stockMovements.quantity,
      occurredOn: schema.stockMovements.occurredOn,
      referenceType: schema.stockMovements.referenceType,
      createdOn: sql<string>`to_char(${schema.stockMovements.createdAt}, 'YYYY-MM-DD')`,
    })
    .from(schema.stockMovements)
    .where(
      and(
        eq(schema.stockMovements.companyId, company.id),
        eq(schema.stockMovements.movementType, 'opening'),
        isNull(schema.stockMovements.value),
      ),
    )
  const unvaluedBalances = await tx
    .select({
      itemId: schema.stockBalances.itemId,
      quantity: schema.stockBalances.quantity,
    })
    .from(schema.stockBalances)
    .where(
      and(
        eq(schema.stockBalances.companyId, company.id),
        isNull(schema.stockBalances.value),
      ),
    )
  const [book] = await tx
    .select({
      balance: sql<string>`coalesce(sum(${schema.ledgerLines.debit}::numeric - ${schema.ledgerLines.credit}::numeric), 0)::text`,
    })
    .from(schema.ledgerLines)
    .where(eq(schema.ledgerLines.ledgerAccountId, stockAccountId))
  const [valued] = await tx
    .select({
      total: sql<string>`coalesce(sum(${schema.stockBalances.value}::numeric), 0)::text`,
    })
    .from(schema.stockBalances)
    .where(eq(schema.stockBalances.companyId, company.id))

  const plan = planStockValueRepair({
    items,
    unvaluedOpenings,
    unvaluedBalances,
    bookStockBalance: book.balance,
    valuedStockTotal: valued.total,
    legacyBefore,
  })

  console.log(`  books Stock In Hand before: ${book.balance}`)
  const posting = new DrizzleLedgerPostingRepository(tx)
  const openingBalanceAccountId = accountId('opening_balance')!
  for (const entry of plan.openingEntries) {
    console.log(
      `  opening stock ${entry.itemName}: ${entry.quantity} → ${entry.value}`,
    )
    await postLedgerEntry(posting, {
      companyId: company.id,
      entryDate: entry.occurredOn,
      narration: `Opening stock: ${entry.itemName}`,
      voucherType: 'journal',
      lines: [
        { ledgerAccountId: stockAccountId, debit: entry.value, credit: '0.00' },
        {
          ledgerAccountId: openingBalanceAccountId,
          debit: '0.00',
          credit: entry.value,
        },
      ],
    })
    await tx
      .update(schema.stockMovements)
      .set({ value: entry.value })
      .where(eq(schema.stockMovements.id, entry.movementId))
  }
  for (const review of plan.needsReview) {
    console.log(
      `  NEEDS OWNER REVIEW / REMOVAL: opening ${review.itemName} (${review.quantity}, ${review.referenceType}) looks seeded or invented — not posted`,
    )
  }
  for (const unpriced of plan.unpricedOpenings) {
    console.log(
      `  NOT POSTED: opening stock ${unpriced.itemName} (${unpriced.quantity}) has no purchase rate`,
    )
  }
  for (const balance of plan.balanceValues) {
    await tx
      .update(schema.stockBalances)
      .set({ value: balance.value })
      .where(
        and(
          eq(schema.stockBalances.companyId, company.id),
          eq(schema.stockBalances.itemId, balance.itemId),
          isNull(schema.stockBalances.value),
        ),
      )
  }
  console.log(`  legacy balances valued: ${plan.balanceValues.length}`)

  if (plan.reconciliation === null) {
    console.log(
      '  no reconciliation: books will differ from stock valuation until the phantom stock above is removed',
    )
    return
  }
  const reconciliation = Number(plan.reconciliation)
  const cogsAccountId = accountId('cogs')
  if (reconciliation !== 0 && cogsAccountId) {
    const amount = Math.abs(reconciliation).toFixed(2)
    console.log(`  reconciliation to COGS: ${plan.reconciliation}`)
    await postLedgerEntry(posting, {
      companyId: company.id,
      entryDate: new Date().toISOString().slice(0, 10),
      narration: 'Stock value reconciliation (moving average)',
      voucherType: 'journal',
      lines:
        reconciliation > 0
          ? [
              {
                ledgerAccountId: stockAccountId,
                debit: amount,
                credit: '0.00',
              },
              { ledgerAccountId: cogsAccountId, debit: '0.00', credit: amount },
            ]
          : [
              { ledgerAccountId: cogsAccountId, debit: amount, credit: '0.00' },
              {
                ledgerAccountId: stockAccountId,
                debit: '0.00',
                credit: amount,
              },
            ],
    })
  }
}

const pool = new Pool({ connectionString })
const db = drizzle({ client: pool, schema })

try {
  console.log(
    `${apply ? 'APPLYING' : 'DRY RUN'} on ${new URL(connectionString).host}`,
  )
  const companies = await db
    .select({
      id: schema.companies.id,
      tradeName: schema.companies.tradeName,
      businessType: schema.companies.businessType,
    })
    .from(schema.companies)
    .where(onlyCompanyId ? eq(schema.companies.id, onlyCompanyId) : undefined)

  for (const company of companies) {
    console.log(`\n${company.tradeName} (${company.id})`)
    try {
      await db.transaction(async (tx) => {
        await repairCompany(tx, company)
        if (!apply) {
          throw new DryRunRollback()
        }
      })
    } catch (error) {
      if (!(error instanceof DryRunRollback)) {
        throw error
      }
    }
  }
  if (!apply) {
    console.log('\nNothing written. Rerun with --apply to post these entries.')
  }
} finally {
  await pool.end()
}
