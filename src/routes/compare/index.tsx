import { createFileRoute } from '@tanstack/react-router'

import { ContentHubPage } from '#/features/marketing/components/content-page.tsx'
import { CONTENT_HUBS, buildContentHubHead } from '#/features/marketing/content-pages.ts'

const hub = CONTENT_HUBS.comparisons

export const Route = createFileRoute('/compare/')({
  head: () => buildContentHubHead(hub),
  component: HubRoute,
})

function HubRoute() {
  return <ContentHubPage collection={hub.collection} headline={hub.headline} intro={hub.intro} />
}
