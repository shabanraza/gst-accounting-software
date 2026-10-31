import { createFileRoute } from '@tanstack/react-router'

import { GstCalculatorPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/gst-calculator/')({
  head: () => buildToolHead('gst-calculator'),
  component: GstCalculatorPage,
})
