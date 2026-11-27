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
    expect(paths).toContain('/help')
    expect(paths).toContain('/help/create-a-sales-invoice')
    expect(paths.some((entry) => entry.startsWith('/app'))).toBe(false)
  })

  test('HSN chapter pages, which list every code, rank with the other tool pages', () => {
    const chapter = listSitemapEntries().find((entry) => entry.path === '/tools/hsn-code-finder/chapter-99')
    expect(chapter).toEqual({ path: '/tools/hsn-code-finder/chapter-99', changefreq: 'monthly', priority: '0.6' })
  })

  test('public/sitemap.xml is up to date (run bun scripts/generate-sitemap.ts)', () => {
    const file = readFileSync(
      path.resolve(import.meta.dirname, '../../../public/sitemap.xml'),
      'utf8',
    )
    expect(file.replace(/\r\n/g, '\n')).toBe(renderSitemapXml(listSitemapEntries()))
  })
})
