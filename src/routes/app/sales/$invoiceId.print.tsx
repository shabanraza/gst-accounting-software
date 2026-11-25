import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { InvoicePrintView } from '#/features/sales/components/invoice-print-view.tsx'

const searchSchema = z.object({
  autoprint: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/app/sales/$invoiceId/print')({
  validateSearch: searchSchema,
  component: InvoicePrintRoute,
})

function InvoicePrintRoute() {
  const { invoiceId } = Route.useParams()
  const { autoprint } = Route.useSearch()
  return <InvoicePrintView autoprint={autoprint} invoiceId={invoiceId} />
}
