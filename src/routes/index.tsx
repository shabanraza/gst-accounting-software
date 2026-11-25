import { createFileRoute } from '@tanstack/react-router'

import { LandingPage } from '#/features/marketing/components/landing-page.tsx'
import {
  SITE,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildSocialImageMeta,
  buildSoftwareJsonLd,
} from '#/features/marketing/landing-content.ts'

export const Route = createFileRoute('/')({
  head: () => {
    const faqJsonLd = JSON.stringify(buildFaqJsonLd())
    const softwareJsonLd = JSON.stringify(buildSoftwareJsonLd())
    const organizationJsonLd = JSON.stringify(buildOrganizationJsonLd())

    return {
      meta: [
        { title: SITE.title },
        { name: 'description', content: SITE.description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: `${SITE.url}/` },
        { property: 'og:title', content: SITE.title },
        { property: 'og:description', content: SITE.description },
        { property: 'og:site_name', content: SITE.name },
        ...buildSocialImageMeta(),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: SITE.title },
        { name: 'twitter:description', content: SITE.description },
      ],
      links: [{ rel: 'canonical', href: `${SITE.url}/` }],
      scripts: [
        {
          type: 'application/ld+json',
          children: softwareJsonLd,
        },
        {
          type: 'application/ld+json',
          children: organizationJsonLd,
        },
        {
          type: 'application/ld+json',
          children: faqJsonLd,
        },
      ],
    }
  },
  component: LandingRoute,
})

function LandingRoute() {
  return <LandingPage />
}
