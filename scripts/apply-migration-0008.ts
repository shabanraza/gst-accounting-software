#!/usr/bin/env bun
import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Load .env.local first.')
  process.exit(1)
}

const statements = [
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS due_date text NOT NULL DEFAULT ''`,
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS po_reference text NOT NULL DEFAULT ''`,
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS transport_mode text NOT NULL DEFAULT ''`,
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS vehicle_no text NOT NULL DEFAULT ''`,
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS lr_number text NOT NULL DEFAULT ''`,
  `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS challan_ref text NOT NULL DEFAULT ''`,
  `ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS po_reference text NOT NULL DEFAULT ''`,
  `ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS transport_mode text NOT NULL DEFAULT ''`,
  `ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS vehicle_no text NOT NULL DEFAULT ''`,
  `ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS lr_number text NOT NULL DEFAULT ''`,
  `ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS challan_ref text NOT NULL DEFAULT ''`,
]

const client = new pg.Client({ connectionString })

try {
  await client.connect()
  for (const sql of statements) {
    await client.query(sql)
    console.log(`✓ ${sql.slice(0, 72)}…`)
  }
  console.log('\nMigration 0008 patch applied.')
} catch (error) {
  console.error('Patch failed:', error)
  process.exit(1)
} finally {
  await client.end()
}
