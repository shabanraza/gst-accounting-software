import { createFileRoute } from '@tanstack/react-router'

import { EInvoiceCheckerPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/e-invoice-e-way-bill-checker')({
  head: () => buildToolHead('e-invoice-e-way-bill-checker'),
  component: EInvoiceCheckerPage,
})
