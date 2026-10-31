import { createFileRoute } from '@tanstack/react-router'

import { GstDueDatesPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/gst-due-dates')({
  head: () => buildToolHead('gst-due-dates'),
  component: GstDueDatesPage,
})
