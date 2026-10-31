import { createFileRoute } from '@tanstack/react-router'

import { HsnFinderPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/hsn-code-finder/')({
  head: () => buildToolHead('hsn-code-finder'),
  component: HsnFinderPage,
})
