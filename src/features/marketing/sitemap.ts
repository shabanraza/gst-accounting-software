import { ALTERNATIVE_SLUGS } from '#/features/marketing/alternatives-content.ts'
import { CONTENT_HUBS } from '#/features/marketing/content-pages.ts'
import { SITE } from '#/features/marketing/landing-content.ts'
import { GST_RATE_PAGES } from '#/features/tools/gst-calculator-service.ts'
import { HSN_CHAPTERS } from '#/features/tools/hsn-service.ts'
import { TOOLS_HUB, TOOL_SLUGS, toolPath } from '#/features/tools/tools-content.ts'

type SitemapEntry = { path: string; changefreq: 'weekly' | 'monthly' | 'yearly'; priority: string }

/** Every public, indexable page. `public/sitemap.xml` is generated from this. */
export function listSitemapEntries(): Array<SitemapEntry> {
  const entries: Array<SitemapEntry> = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: TOOLS_HUB.path, changefreq: 'monthly', priority: '0.8' },
    ...TOOL_SLUGS.map((slug) => ({ path: toolPath(slug), changefreq: 'monthly' as const, priority: '0.8' })),
    ...GST_RATE_PAGES.map((page) => ({
      path: `${toolPath('gst-calculator')}/${page.slug}`,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
    ...HSN_CHAPTERS.map((chapter) => ({
      path: `${toolPath('hsn-code-finder')}/${chapter.slug}`,
      changefreq: 'yearly' as const,
      priority: '0.4',
    })),
  ]

  for (const hub of Object.values(CONTENT_HUBS)) {
    entries.push({ path: hub.collection.basePath, changefreq: 'monthly', priority: '0.6' })
    for (const page of hub.collection.pages) {
      entries.push({ path: `${hub.collection.basePath}/${page.slug}`, changefreq: 'monthly', priority: '0.6' })
    }
  }

  entries.push(
    ...ALTERNATIVE_SLUGS.map((slug) => ({
      path: `/alternatives/${slug}`,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
    { path: '/changelog', changefreq: 'weekly', priority: '0.5' },
    { path: '/contact', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { path: '/data-deletion', changefreq: 'yearly', priority: '0.3' },
  )

  return entries
}

export function renderSitemapXml(entries: ReadonlyArray<SitemapEntry>): string {
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${SITE.url}${entry.path}</loc>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
