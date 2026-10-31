#!/usr/bin/env bun
// Regenerates public/sitemap.xml from the marketing and tools content.
// Run after adding a public page: bun scripts/generate-sitemap.ts
import { writeFileSync } from 'node:fs'

import { listSitemapEntries, renderSitemapXml } from '../src/features/marketing/sitemap.ts'

const entries = listSitemapEntries()
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), renderSitemapXml(entries))
console.log(`Wrote ${entries.length} URLs to public/sitemap.xml`)
