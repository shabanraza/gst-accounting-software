import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

import { assertSchemaChangeAllowed } from './scripts/db-guard.ts'

config({ path: ['.env.local', '.env'] })

// `generate` only writes files; these two change the database.
if (process.argv.some((arg) => arg === 'push' || arg === 'migrate')) {
  assertSchemaChangeAllowed()
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
