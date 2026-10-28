#!/usr/bin/env bun
/**
 * Finds and removes the demo masters and phantom opening stock that app
 * versions before PR #25 seeded into every company.
 *
 *   bun scripts/cleanup-legacy-demo-data.ts              report only
 *   bun scripts/cleanup-legacy-demo-data.ts --apply      remove what is safe
 *   --include-default-openings   also remove 100-unit default openings on the
 *                                user's own items (listed for review otherwise)
 *   --legacy-before=2026-10-28   openings created before this date can be
 *                                legacy defaults (PR #25 production deploy)
 *
 * Only records that nothing real refers to are removed, one transaction per
 * company, with an audit event. Run against a Neon branch first.
 */
import { config } from 'dotenv'
import pg from 'pg'

import {
  LEGACY_DEMO_GODOWNS,
  LEGACY_DEMO_ITEMS,
  LEGACY_DEMO_PARTIES,
  planLegacyDemoCleanup,
} from '#/features/companies/legacy-demo-cleanup.ts'

import type {
  CleanupPlan,
  CompanySnapshot,
} from '#/features/companies/legacy-demo-cleanup.ts'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const includeDefaultOpenings = args.includes('--include-default-openings')
const legacyBeforeArg = args
  .find((arg) => arg.startsWith('--legacy-before='))
  ?.split('=')[1]
const legacyBefore = new Date(`${legacyBeforeArg ?? '2026-10-28'}T00:00:00Z`)

const PARTY_REFERENCES = [
  ['sales_invoices', 'customer_id'],
  ['purchase_bills', 'supplier_id'],
  ['credit_debit_notes', 'party_id'],
  ['sales_documents', 'customer_id'],
  ['purchase_orders', 'supplier_id'],
  ['purchase_grns', 'supplier_id'],
] as const

const ITEM_REFERENCES = [
  'sales_invoice_lines',
  'purchase_bill_lines',
  'sales_document_lines',
  'purchase_order_lines',
  'purchase_grn_lines',
  'price_list_items',
] as const

const GODOWN_REFERENCES = [
  ['sales_invoices', 'company_id', null],
  ['purchase_bills', 'company_id', null],
  ['purchase_grns', 'company_id', null],
  ['sales_invoice_lines', 'sales_invoice_id', 'sales_invoices'],
  ['purchase_bill_lines', 'purchase_bill_id', 'purchase_bills'],
] as const

async function referencedIds(
  client: pg.PoolClient,
  references: ReadonlyArray<readonly [string, string]>,
  ids: Array<string>,
) {
  const found = new Set<string>()
  if (ids.length === 0) return found
  for (const [table, column] of references) {
    const result = await client.query<{ id: string }>(
      `select distinct ${column}::text as id from ${table} where ${column} = any($1::uuid[])`,
      [ids],
    )
    for (const row of result.rows) found.add(row.id)
  }
  return found
}

async function usedGodownNames(client: pg.PoolClient, companyId: string) {
  const used = new Set<string>()
  for (const [table, key, header] of GODOWN_REFERENCES) {
    const sql = header
      ? `select distinct l.godown_name as name from ${table} l join ${header} h on h.id = l.${key} where h.company_id = $1 and l.godown_name = any($2)`
      : `select distinct godown_name as name from ${table} where ${key} = $1 and godown_name = any($2)`
    const result = await client.query<{ name: string }>(sql, [
      companyId,
      LEGACY_DEMO_GODOWNS,
    ])
    for (const row of result.rows) used.add(row.name)
  }
  return used
}

async function loadSnapshot(
  client: pg.PoolClient,
  companyId: string,
): Promise<CompanySnapshot> {
  const parties = await client.query<{
    id: string
    name: string
    gstin: string | null
  }>(
    'select id, name, gstin from parties where company_id = $1 and name = any($2)',
    [companyId, LEGACY_DEMO_PARTIES.map((party) => party.name)],
  )
  const items = await client.query<{
    id: string
    name: string
    hsnCode: string
  }>(
    'select id, name, hsn_code as "hsnCode" from items where company_id = $1',
    [companyId],
  )
  const godowns = await client.query<{
    id: string
    name: string
    isDefault: boolean
  }>(
    'select id, name, is_default as "isDefault" from godowns where company_id = $1',
    [companyId],
  )
  const movements = await client.query<{
    id: string
    itemId: string
    direction: 'in' | 'out'
    quantity: string
    referenceType: string
    godownName: string | null
    createdAt: Date
  }>(
    `select id, item_id as "itemId", direction, quantity, reference_type as "referenceType",
            godown_name as "godownName", created_at as "createdAt"
       from stock_movements where company_id = $1`,
    [companyId],
  )

  const demoItemIds = items.rows
    .filter((item) =>
      LEGACY_DEMO_ITEMS.some(
        (demo) => demo.name === item.name && demo.hsnCode === item.hsnCode,
      ),
    )
    .map((item) => item.id)

  return {
    parties: parties.rows,
    items: items.rows,
    godowns: godowns.rows,
    movements: movements.rows,
    referencedPartyIds: await referencedIds(
      client,
      PARTY_REFERENCES,
      parties.rows.map((party) => party.id),
    ),
    referencedItemIds: await referencedIds(
      client,
      ITEM_REFERENCES.map((table) => [table, 'item_id'] as const),
      demoItemIds,
    ),
    usedGodownNames: await usedGodownNames(client, companyId),
  }
}

async function applyPlan(
  client: pg.PoolClient,
  companyId: string,
  plan: CleanupPlan,
) {
  await client.query(
    'delete from stock_movements where company_id = $1 and id = any($2::uuid[])',
    [companyId, plan.removeMovementIds],
  )
  for (const balance of plan.balances) {
    await client.query(
      'update stock_balances set quantity = $3, updated_at = now() where company_id = $1 and item_id = $2',
      [companyId, balance.itemId, balance.quantity],
    )
  }
  await client.query(
    'delete from stock_balances where company_id = $1 and item_id = any($2::uuid[])',
    [companyId, plan.removeItemIds],
  )
  await client.query(
    'delete from items where company_id = $1 and id = any($2::uuid[])',
    [companyId, plan.removeItemIds],
  )
  await client.query(
    'delete from parties where company_id = $1 and id = any($2::uuid[])',
    [companyId, plan.removePartyIds],
  )
  await client.query(
    'delete from godowns where company_id = $1 and id = any($2::uuid[])',
    [companyId, plan.removeGodownIds],
  )
  await client.query(
    `insert into audit_events (company_id, actor_user_id, action, entity_type, entity_id, metadata)
     values ($1::uuid, 'system:cleanup-legacy-demo-data', 'legacy_demo_data.removed', 'company', $1::text, $2)`,
    [
      companyId,
      JSON.stringify({
        parties: plan.removePartyIds.length,
        items: plan.removeItemIds.length,
        godowns: plan.removeGodownIds.length,
        stockMovements: plan.removeMovementIds.length,
      }),
    ],
  )
}

function hasChanges(plan: CleanupPlan) {
  return (
    plan.removePartyIds.length +
      plan.removeItemIds.length +
      plan.removeGodownIds.length +
      plan.removeMovementIds.length >
    0
  )
}

const pool = new pg.Pool({ connectionString })
const client = await pool.connect()
const totals = { companies: 0, parties: 0, items: 0, godowns: 0, movements: 0 }
const kept: Array<string> = []
const review: Array<string> = []

try {
  const companies = await client.query<{ id: string; name: string }>(
    'select id, trade_name as name from companies order by created_at',
  )
  for (const company of companies.rows) {
    await client.query('begin')
    try {
      const plan = planLegacyDemoCleanup(
        await loadSnapshot(client, company.id),
        { legacyBefore, includeDefaultOpenings },
      )
      for (const entry of [
        ...plan.keepParties,
        ...plan.keepItems,
        ...plan.keepGodowns,
      ]) {
        kept.push(`${company.name}: kept ${entry.name} (${entry.reason})`)
      }
      for (const entry of plan.reviewMovements) {
        review.push(
          `${company.name}: ${entry.itemName} has a 100-unit default opening`,
        )
      }
      if (hasChanges(plan)) {
        totals.companies += 1
        totals.parties += plan.removePartyIds.length
        totals.items += plan.removeItemIds.length
        totals.godowns += plan.removeGodownIds.length
        totals.movements += plan.removeMovementIds.length
        if (apply) await applyPlan(client, company.id, plan)
      }
      await client.query(apply ? 'commit' : 'rollback')
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  }
} finally {
  client.release()
  await pool.end()
}

console.log(apply ? 'Applied.' : 'Report only (pass --apply to remove).')
console.log(
  `${totals.companies} companies: ${totals.parties} demo parties, ${totals.items} demo items, ${totals.godowns} demo godowns, ${totals.movements} phantom stock movements ${apply ? 'removed' : 'to remove'}.`,
)
if (kept.length > 0) console.log(`\nKept:\n${kept.join('\n')}`)
if (review.length > 0) {
  console.log(
    `\nNeeds owner review (rerun with --include-default-openings to remove):\n${review.join('\n')}`,
  )
}
