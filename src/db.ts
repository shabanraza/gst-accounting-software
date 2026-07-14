import { neon } from '@neondatabase/serverless'

import { getDb } from '#/db/client.ts'

/** @deprecated Prefer getDb() from #/db/client.ts */
export async function getClient() {
  if (!process.env.DATABASE_URL) {
    return undefined
  }
  return neon(process.env.DATABASE_URL)
}

export { getDb }
