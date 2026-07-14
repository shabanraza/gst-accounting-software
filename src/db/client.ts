import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from '#/db/schema.ts'

import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'

export type AppDatabase = NeonHttpDatabase<typeof schema>

let cachedDb: AppDatabase | null | undefined

/** Shared Neon HTTP client — safe on Cloudflare Workers (no TCP / node-postgres). */
export function getDb(): AppDatabase | null {
  if (cachedDb !== undefined) {
    return cachedDb
  }

  if (!process.env.DATABASE_URL) {
    cachedDb = null
    return null
  }

  const sql = neon(process.env.DATABASE_URL)
  cachedDb = drizzle({ client: sql, schema })
  return cachedDb
}
