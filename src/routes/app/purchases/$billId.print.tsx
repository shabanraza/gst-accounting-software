import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PurchaseBillPrintView } from '#/features/purchases/components/purchase-bill-print-view.tsx'

const searchSchema = z.object({
  autoprint: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/app/purchases/$billId/print')({
  validateSearch: searchSchema,
  component: PurchaseBillPrintRoute,
})

function PurchaseBillPrintRoute() {
  const { billId } = Route.useParams()
  const { autoprint } = Route.useSearch()
  return <PurchaseBillPrintView autoprint={autoprint} billId={billId} />
}
