#!/usr/bin/env bun
/**
 * Regenerates the HSN/SAC code data used by /tools/hsn-code-finder from the
 * GST portal's master file (https://tutorial.gst.gov.in/downloads/HSN_SAC.xlsx):
 *
 *   bun scripts/build-hsn-data.ts path/to/HSN_SAC.xlsx
 *
 * Writes src/features/tools/hsn-data/hsn-NN.json (one per goods chapter) and
 * sac.json (chapter 99), replacing what is there. Update the date in
 * src/features/tools/hsn-source.ts when the source file changes.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readSheet } from 'read-excel-file/node'

import { buildHsnDataFiles } from './hsn-master.ts'
import type { HsnDataRow } from './hsn-master.ts'

const input = process.argv[2]
if (!input) {
  console.error('Usage: bun scripts/build-hsn-data.ts path/to/HSN_SAC.xlsx')
  process.exit(1)
}

const OUT_DIR = new URL('../src/features/tools/hsn-data/', import.meta.url)

const [hsnRows, sacRows] = await Promise.all([readSheet(input, 'HSN_MSTR'), readSheet(input, 'SAC_MSTR')])
const { files, dropped, duplicates } = buildHsnDataFiles(hsnRows, sacRows)

mkdirSync(OUT_DIR, { recursive: true })
for (const file of readdirSync(OUT_DIR)) {
  if (file.endsWith('.json')) rmSync(join(fileURLToPath(OUT_DIR), file))
}

const render = (rows: ReadonlyArray<HsnDataRow>) =>
  `[\n${rows.map((row) => JSON.stringify(row)).join(',\n')}\n]\n`

let total = 0
let bytes = 0
for (const [chapter, rows] of Object.entries(files)) {
  const name = chapter === '99' ? 'sac.json' : `hsn-${chapter}.json`
  const text = render(rows)
  writeFileSync(new URL(name, OUT_DIR), text)
  total += rows.length
  bytes += Buffer.byteLength(text)
}

console.log(`Wrote ${total} codes in ${Object.keys(files).length} files (${Math.round(bytes / 1024)} KB).`)
if (duplicates.length > 0) console.log(`Skipped repeated codes: ${duplicates.join(', ')}`)
for (const entry of dropped) {
  console.log(`Dropped ${entry.sheet} "${entry.code}" (${entry.reason}): ${entry.description.slice(0, 70)}`)
}
