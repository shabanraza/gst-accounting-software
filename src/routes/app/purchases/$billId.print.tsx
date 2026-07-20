import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { loadPurchaseBillPrintDocument } from '#/features/documents/voucher-print-loader.ts'
import { PurchaseBillPrintView } from '#/features/purchases/components/purchase-bill-print-view.tsx'

const searchSchema = z.object({
  autoprint: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/app/purchases/$billId/print')({
  validateSearch: searchSchema,
  loader: ({ params }) => loadPurchaseBillPrintDocument(params.billId),
  component: PurchaseBillPrintRoute,
})

function PurchaseBillPrintRoute() {
  const { billId } = Route.useParams()
  const { autoprint } = Route.useSearch()
  const printDocument = Route.useLoaderData()
  return (
    <PurchaseBillPrintView
      autoprint={autoprint}
      billId={billId}
      initialDocument={printDocument}
    />
  )
}
