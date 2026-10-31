import { createFileRoute } from '@tanstack/react-router'

import { ToolsHubPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolsHubHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/')({
  head: buildToolsHubHead,
  component: ToolsHubPage,
})
