import { createFileRoute, notFound } from '@tanstack/react-router'

import { ContentArticlePage } from '#/features/marketing/components/content-page.tsx'
import {
  COMPARISONS,
  buildContentPageHead,
  findContentPage,
} from '#/features/marketing/content-pages.ts'

export const Route = createFileRoute('/compare/$slug')({
  loader: ({ params }) => {
    const page = findContentPage(COMPARISONS, params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData: page }) => (page ? buildContentPageHead(COMPARISONS, page) : {}),
  component: ContentRoute,
})

function ContentRoute() {
  const page = Route.useLoaderData()
  return <ContentArticlePage collection={COMPARISONS} page={page} />
}
