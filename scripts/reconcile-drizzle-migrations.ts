#!/usr/bin/env bun
/**
 * Stamps drizzle migrations 0003–0007 as applied when schema already exists
 * but __drizzle_migrations is behind (common after manual db:push).
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
