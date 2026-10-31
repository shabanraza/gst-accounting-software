import { createFileRoute } from '@tanstack/react-router'

import { ContactPage } from '#/features/marketing/components/contact-page.tsx'
import {
  CONTACT,
  SITE,
  buildSocialImageMeta,
} from '#/features/marketing/landing-content.ts'

const title = `${CONTACT.pageTitle} — GST billing & accounting support`

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: CONTACT.pageDescription },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE.url}/contact` },
      { property: 'og:title', content: title },
      { property: 'og:description', content: CONTACT.pageDescription },
      { property: 'og:site_name', content: SITE.name },
      ...buildSocialImageMeta(),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: CONTACT.pageDescription },
    ],
    links: [{ rel: 'canonical', href: `${SITE.url}/contact` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: CONTACT.pageTitle,
          url: `${SITE.url}/contact`,
          description: CONTACT.pageDescription,
        }),
      },
    ],
  }),
  component: ContactRoute,
})

function ContactRoute() {
  return <ContactPage />
}
