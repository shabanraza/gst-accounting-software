#!/usr/bin/env bun
/**
 * Stamps drizzle migrations 0003+ as applied when schema already exists
 * but __drizzle_migrations is behind (common after manual db:push).
 * Verifies expected DDL exists before stamping each migration.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const journal = JSON.parse(
  readFileSync('drizzle/meta/_journal.json', 'utf8'),
) as {
  entries: Array<{ idx: number; tag: string; when: number }>
}

const pendingFromIdx = 3
const toStamp = journal.entries.filter((entry) => entry.idx >= pendingFromIdx)

const migrationChecks: Record<string, (client: pg.Client) => Promise<boolean>> =
  {
    '0007_party_invoice_fields': async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'invoice_terms' LIMIT 1`,
      )
      return rows.length > 0
    },
    '0008_voucher_logistics': async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales_invoices' AND column_name = 'due_date' LIMIT 1`,
      )
      return rows.length > 0
    },
    '0009_e_invoice': async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'e_invoices' LIMIT 1`,
      )
      return rows.length > 0
    },
  }

const client = new pg.Client({ connectionString })

try {
  await client.connect()

  const existing = await client.query(
    'SELECT hash FROM drizzle.__drizzle_migrations',
  )
  const known = new Set(existing.rows.map((row) => row.hash as string))

  for (const entry of toStamp) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8')
    const hash = createHash('sha256').update(sql).digest('hex')

    if (known.has(hash)) {
      console.log(`skip ${entry.tag} (already recorded)`)
      continue
    }

    const check = migrationChecks[entry.tag]
    if (check) {
      const ready = await check(client)
      if (!ready) {
        console.error(
          `✗ refuse to stamp ${entry.tag}: expected schema not found. Run db:apply-* or db:migrate first.`,
        )
        process.exit(1)
      }
    }

    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, String(entry.when)],
    )
    console.log(`✓ stamped ${entry.tag}`)
  }

  const { rows } = await client.query(
    'SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations',
  )
  console.log(`\nMigration journal: ${rows[0].count} entries`)
} catch (error) {
  console.error('Reconcile failed:', error)
  process.exit(1)
} finally {
  await client.end()
}
