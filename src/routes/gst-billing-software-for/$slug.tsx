import { createFileRoute, notFound } from '@tanstack/react-router'

import { ContentArticlePage } from '#/features/marketing/components/content-page.tsx'
import {
  USE_CASES,
  buildContentPageHead,
  findContentPage,
} from '#/features/marketing/content-pages.ts'

export const Route = createFileRoute('/gst-billing-software-for/$slug')({
  loader: ({ params }) => {
    const page = findContentPage(USE_CASES, params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData: page }) => (page ? buildContentPageHead(USE_CASES, page) : {}),
  component: ContentRoute,
})

function ContentRoute() {
  const page = Route.useLoaderData()
  return <ContentArticlePage collection={USE_CASES} page={page} />
}
