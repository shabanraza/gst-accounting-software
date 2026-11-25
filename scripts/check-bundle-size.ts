#!/usr/bin/env bun
/**
 * Fails when a browser JS chunk grows past its budget. Run after `bun run build`:
 *
 *   bun run check:bundle
 *
 * The entry chunk holds React, the router, tRPC and React Query, so it gets a
 * larger budget; every other chunk (pages, charts, master data) must stay
 * smaller so heavy libraries keep loading only where they are used.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS = 'dist/client/assets'
const ENTRY_BUDGET_KB = 520
const CHUNK_BUDGET_KB = 360

const chunks = readdirSync(ASSETS)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({
    file,
    kb: Math.round(statSync(join(ASSETS, file)).size / 1024),
    budget: file.startsWith('index-') ? ENTRY_BUDGET_KB : CHUNK_BUDGET_KB,
  }))
  .sort((a, b) => b.kb - a.kb)

for (const chunk of chunks.slice(0, 5)) {
  console.log(`${String(chunk.kb).padStart(6)} KB  ${chunk.file}`)
}

const over = chunks.filter((chunk) => chunk.kb > chunk.budget)
if (over.length > 0) {
  for (const chunk of over) {
    console.error(
      `Over budget: ${chunk.file} is ${chunk.kb} KB (limit ${chunk.budget} KB)`,
    )
  }
  process.exit(1)
}
console.log('All chunks within budget.')
