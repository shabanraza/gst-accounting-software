import { Pool, neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless'

import * as schema from '#/db/schema.ts'

import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

/** Any Drizzle Postgres database or transaction bound to the app schema. */
export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>

export type PooledDatabase = {
  database: AppDatabase
  close: () => Promise<void>
}

let cachedDb: AppDatabase | null | undefined

function databaseUrl(): string | null {
  const url = process.env.DATABASE_URL
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is required in production; refusing to use in-memory repositories',
    )
  }
  return url || null
}

/** Shared Neon HTTP client — safe on Cloudflare Workers (no TCP / node-postgres). */
export function getDb(): AppDatabase | null {
  if (cachedDb !== undefined) {
    return cachedDb
  }

  const url = databaseUrl()
  if (!url) {
    cachedDb = null
    return null
  }

  const sql = neon(url)
  cachedDb = drizzle({ client: sql, schema })
  return cachedDb
}

/**
 * Neon WebSocket pool for interactive transactions. Workers cannot reuse
 * sockets across requests, so open one per request and close it when done.
 */
export function openPooledDb(): PooledDatabase | null {
  const url = databaseUrl()
  if (!url) {
    return null
  }

  const pool = new Pool({ connectionString: url })
  return {
    database: drizzlePool({ client: pool, schema }),
    close: () => pool.end(),
  }
}
