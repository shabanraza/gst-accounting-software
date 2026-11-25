import { createFileRoute } from '@tanstack/react-router'

import { HelpHubPage } from '#/features/marketing/components/help-page.tsx'
import { buildHelpHubHead } from '#/features/marketing/help-content.ts'

export const Route = createFileRoute('/help/')({
  head: () => buildHelpHubHead(),
  component: HelpHubPage,
})
