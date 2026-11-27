import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const folder = path.resolve(process.cwd(), 'drizzle')
const files = readdirSync(folder)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => name.replace(/\.sql$/, ''))
  .sort()
const entries = (
  JSON.parse(
    readFileSync(path.join(folder, 'meta/_journal.json'), 'utf8'),
  ) as { entries: Array<{ idx: number; tag: string; when: number }> }
).entries

describe('migration journal', () => {
  test('lists every migration file, in order, so db:migrate skips none', () => {
    expect(entries.map((entry) => entry.tag)).toEqual(files)
  })

  test('numbers each entry after its file', () => {
    for (const entry of entries) {
      expect(entry.idx).toBe(Number(entry.tag.slice(0, 4)))
    }
  })
})

describe('migration order', () => {
  // The first entries were generated out of timestamp order; on a database
  // with no history they all run. Later ones must only move forward, or a
  // database that is already part way would skip them.
  test('timestamps only increase from 0008 on', () => {
    const later = entries.filter((entry) => entry.idx >= 8)
    for (let index = 1; index < later.length; index += 1) {
      expect(later[index].when).toBeGreaterThan(later[index - 1].when)
    }
  })
})
