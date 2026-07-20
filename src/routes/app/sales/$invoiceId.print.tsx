import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { loadSalesInvoicePrintDocument } from '#/features/documents/voucher-print-loader.ts'
import { InvoicePrintView } from '#/features/sales/components/invoice-print-view.tsx'

const searchSchema = z.object({
  autoprint: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/app/sales/$invoiceId/print')({
  validateSearch: searchSchema,
  loader: ({ params }) => loadSalesInvoicePrintDocument(params.invoiceId),
  component: InvoicePrintRoute,
})

function InvoicePrintRoute() {
  const { invoiceId } = Route.useParams()
  const { autoprint } = Route.useSearch()
  const printDocument = Route.useLoaderData()
  return (
    <InvoicePrintView
      autoprint={autoprint}
      initialDocument={printDocument}
      invoiceId={invoiceId}
    />
  )
}
