import { createFileRoute } from '@tanstack/react-router'

import { InvoiceGeneratorPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/gst-invoice-generator')({
  head: () => buildToolHead('gst-invoice-generator'),
  component: InvoiceGeneratorPage,
})
