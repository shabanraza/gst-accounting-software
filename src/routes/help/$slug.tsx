import { createFileRoute, notFound } from '@tanstack/react-router'

import { HelpGuidePage } from '#/features/marketing/components/help-page.tsx'
import { buildHelpGuideHead, findHelpGuide } from '#/features/marketing/help-content.ts'

export const Route = createFileRoute('/help/$slug')({
  loader: ({ params }) => {
    const guide = findHelpGuide(params.slug)
    if (!guide) throw notFound()
    return guide
  },
  head: ({ loaderData: guide }) => (guide ? buildHelpGuideHead(guide) : {}),
  component: HelpGuideRoute,
})

function HelpGuideRoute() {
  const guide = Route.useLoaderData()
  return <HelpGuidePage guide={guide} />
}
