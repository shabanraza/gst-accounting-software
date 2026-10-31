import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildMarketingHead,
  buildWebApplicationJsonLd,
} from '#/features/marketing/page-head.ts'
import { SITE } from '#/features/marketing/landing-content.ts'
import type { GstRatePage } from '#/features/tools/gst-calculator-service.ts'
import type { HsnChapter } from '#/features/tools/hsn-service.ts'
import { TOOLS, TOOLS_HUB, TOOL_SLUGS, toolPath } from '#/features/tools/tools-content.ts'
import type { ToolSlug } from '#/features/tools/tools-content.ts'

export function buildToolHead(slug: ToolSlug) {
  const tool = TOOLS[slug]
  const path = toolPath(slug)
  return buildMarketingHead({
    path,
    title: tool.seoTitle,
    description: tool.seoDescription,
    jsonLd: [
      buildWebApplicationJsonLd({ name: tool.name, path, description: tool.seoDescription }),
      buildFaqPageJsonLd(tool.faq),
      buildBreadcrumbJsonLd([
        { name: 'Free tools', path: TOOLS_HUB.path },
        { name: tool.name, path },
      ]),
    ],
  })
}

export function buildToolsHubHead() {
  return buildMarketingHead({
    path: TOOLS_HUB.path,
    title: TOOLS_HUB.seoTitle,
    description: TOOLS_HUB.seoDescription,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: TOOL_SLUGS.map((slug, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: TOOLS[slug].name,
          url: `${SITE.url}${toolPath(slug)}`,
        })),
      },
      buildBreadcrumbJsonLd([{ name: 'Free tools', path: TOOLS_HUB.path }]),
    ],
  })
}

export function ratePageCopy(page: GstRatePage) {
  return {
    path: `${toolPath('gst-calculator')}/${page.slug}`,
    title: `${page.label} GST Calculator — Add or Remove ${page.label} GST | ${SITE.name}`,
    description: `Calculate ${page.label} GST on any amount: add GST, remove it from an inclusive price, and split it into CGST + SGST or IGST. ${page.appliesTo}`,
    headline: `${page.label} GST calculator`,
    intro: `Add ${page.label} GST to a price or take it out of an inclusive amount. ${page.appliesTo} Confirm the rate for your HSN or SAC code before billing.`,
  }
}

export function buildRatePageHead(page: GstRatePage) {
  const copy = ratePageCopy(page)
  return buildMarketingHead({
    path: copy.path,
    title: copy.title,
    description: copy.description,
    jsonLd: [
      buildWebApplicationJsonLd({ name: copy.headline, path: copy.path, description: copy.description }),
      buildBreadcrumbJsonLd([
        { name: 'Free tools', path: TOOLS_HUB.path },
        { name: TOOLS['gst-calculator'].name, path: toolPath('gst-calculator') },
        { name: page.label, path: copy.path },
      ]),
    ],
  })
}

export function chapterPageCopy(chapter: HsnChapter) {
  const isServices = chapter.code === '99'
  return {
    path: `${toolPath('hsn-code-finder')}/${chapter.slug}`,
    title: isServices
      ? `SAC Codes List — Service Accounting Codes for GST (Chapter 99) | ${SITE.name}`
      : `HSN Code Chapter ${chapter.code}: ${chapter.title} | ${SITE.name}`,
    description: isServices
      ? 'All SAC service headings used under GST, from 9954 construction to 9999, with how the six-digit SAC codes are structured.'
      : `HSN chapter ${chapter.code} covers ${chapter.title.toLowerCase()}. See the section it belongs to, how its 4-, 6-, and 8-digit codes are built, and where to check the GST rate.`,
    headline: isServices ? 'SAC codes for services (chapter 99)' : `HSN chapter ${chapter.code}: ${chapter.title}`,
    intro: isServices
      ? 'Services under GST use SAC codes that start with 99. The four-digit heading names the service group, and the six-digit code names the exact service.'
      : `Goods in chapter ${chapter.code} have HSN codes starting with ${chapter.code}. Use the four-digit heading on invoices if your turnover is up to ₹5 crore, and six digits above that.`,
  }
}

export function buildChapterPageHead(chapter: HsnChapter) {
  const copy = chapterPageCopy(chapter)
  return buildMarketingHead({
    path: copy.path,
    title: copy.title,
    description: copy.description,
    jsonLd: [
      buildBreadcrumbJsonLd([
        { name: 'Free tools', path: TOOLS_HUB.path },
        { name: TOOLS['hsn-code-finder'].name, path: toolPath('hsn-code-finder') },
        { name: `Chapter ${chapter.code}`, path: copy.path },
      ]),
    ],
  })
}
