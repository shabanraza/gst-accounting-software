import { SITE, buildSocialImageMeta } from '#/features/marketing/landing-content.ts'

export type FaqItem = { question: string; answer: string }

export type Crumb = { name: string; path: string }

export type ContentSection = { heading: string; paragraphs: ReadonlyArray<string> }

/** Canonical, Open Graph, Twitter, and JSON-LD for a public marketing page. */
export function buildMarketingHead(input: {
  path: string
  title: string
  description: string
  jsonLd?: ReadonlyArray<object>
}) {
  const url = `${SITE.url}${input.path}`
  return {
    meta: [
      { title: input.title },
      { name: 'description', content: input.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:title', content: input.title },
      { property: 'og:description', content: input.description },
      { property: 'og:site_name', content: SITE.name },
      ...buildSocialImageMeta(),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: input.title },
      { name: 'twitter:description', content: input.description },
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: (input.jsonLd ?? []).map((entry) => ({
      type: 'application/ld+json',
      children: JSON.stringify(entry),
    })),
  }
}

export function buildFaqPageJsonLd(items: ReadonlyArray<FaqItem>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function buildBreadcrumbJsonLd(trail: ReadonlyArray<Crumb>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE.url}${crumb.path}`,
    })),
  }
}

/** Free tools are free web apps; this lets them show as such in search. */
export function buildWebApplicationJsonLd(input: {
  name: string
  path: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    url: `${SITE.url}${input.path}`,
    description: input.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  }
}
