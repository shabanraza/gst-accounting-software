#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import pg from 'pg'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Load .env.local first.')
  process.exit(1)
}

const sql = readFileSync(
  new URL('../drizzle/0009_e_invoice.sql', import.meta.url),
  'utf8',
)

const client = new pg.Client({ connectionString })

try {
  await client.connect()
  await client.query(sql)
  console.log('✓ Migration 0009 (e_invoices, e_way_bills) applied.')
} catch (error) {
  console.error('Patch failed:', error)
  process.exit(1)
} finally {
  await client.end()
}
