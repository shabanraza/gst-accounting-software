import { createFileRoute, notFound } from '@tanstack/react-router'

import { GstRatePageView } from '#/features/tools/components/tool-pages.tsx'
import { getRatePage } from '#/features/tools/gst-calculator-service.ts'
import { buildRatePageHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/gst-calculator/$rate')({
  loader: ({ params }) => {
    const page = getRatePage(params.rate)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData: page }) => (page ? buildRatePageHead(page) : {}),
  component: GstRateRoute,
})

function GstRateRoute() {
  const page = Route.useLoaderData()
  return <GstRatePageView page={page} />
}
