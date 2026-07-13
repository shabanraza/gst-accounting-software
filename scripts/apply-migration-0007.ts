#!/usr/bin/env bun
/**
 * Applies migration 0007 columns safely (IF NOT EXISTS).
 * Use when drizzle migrate is out of sync with the live DB.
 */
import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Load .env.local first.')
  process.exit(1)
}

const statements = [
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_terms text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line1 text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line2 text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS pincode text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT ''`,
  `ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT ''`,
]

const client = new pg.Client({ connectionString })

try {
  await client.connect()
  for (const sql of statements) {
    await client.query(sql)
    console.log(`✓ ${sql.slice(0, 72)}…`)
  }
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'invoice_terms'`,
  )
  if (rows.length === 0) {
    throw new Error('invoice_terms column still missing after patch')
  }
  console.log('\nMigration 0007 patch applied. Hard-refresh the app.')
} catch (error) {
  console.error('Patch failed:', error)
  process.exit(1)
} finally {
  await client.end()
}
