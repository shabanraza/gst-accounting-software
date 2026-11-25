import { createFileRoute } from '@tanstack/react-router'

import { ChangelogPage } from '#/features/changelog/components/changelog-page.tsx'
import {
  SITE,
  buildSocialImageMeta,
} from '#/features/marketing/landing-content.ts'

const title = `Changelog — ${SITE.name}`
const description = `New features, improvements and fixes in ${SITE.name}, the free GST billing and accounting app.`

export const Route = createFileRoute('/changelog')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE.url}/changelog` },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:site_name', content: SITE.name },
      ...buildSocialImageMeta(),
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: `${SITE.url}/changelog` }],
  }),
  component: ChangelogPage,
})
