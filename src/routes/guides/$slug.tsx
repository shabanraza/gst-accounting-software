import { createFileRoute, notFound } from '@tanstack/react-router'

import { ContentArticlePage } from '#/features/marketing/components/content-page.tsx'
import {
  GUIDES,
  buildContentPageHead,
  findContentPage,
} from '#/features/marketing/content-pages.ts'

export const Route = createFileRoute('/guides/$slug')({
  loader: ({ params }) => {
    const page = findContentPage(GUIDES, params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData: page }) => (page ? buildContentPageHead(GUIDES, page) : {}),
  component: ContentRoute,
})

function ContentRoute() {
  const page = Route.useLoaderData()
  return <ContentArticlePage collection={GUIDES} page={page} />
}
