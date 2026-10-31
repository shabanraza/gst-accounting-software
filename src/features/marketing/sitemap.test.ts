import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { listSitemapEntries, renderSitemapXml } from '#/features/marketing/sitemap.ts'

describe('sitemap', () => {
  test('lists each public path once', () => {
    const paths = listSitemapEntries().map((entry) => entry.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toContain('/tools/gst-calculator')
    expect(paths).toContain('/tools/hsn-code-finder/chapter-85')
    expect(paths).toContain('/guides/gst-invoice-format')
    expect(paths).toContain('/alternatives/marg')
    expect(paths.some((entry) => entry.startsWith('/app'))).toBe(false)
  })

  test('public/sitemap.xml is up to date (run bun scripts/generate-sitemap.ts)', () => {
    const file = readFileSync(
      path.resolve(import.meta.dirname, '../../../public/sitemap.xml'),
      'utf8',
    )
    expect(file.replace(/\r\n/g, '\n')).toBe(renderSitemapXml(listSitemapEntries()))
  })
})
