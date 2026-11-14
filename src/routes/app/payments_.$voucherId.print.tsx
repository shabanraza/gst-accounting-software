import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ReceiptPrintView } from '#/features/payments/components/receipt-print-view.tsx'

const searchSchema = z.object({
  autoprint: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/app/payments_/$voucherId/print')({
  validateSearch: searchSchema,
  component: PaymentVoucherPrintRoute,
})

function PaymentVoucherPrintRoute() {
  const { voucherId } = Route.useParams()
  const { autoprint } = Route.useSearch()
  return <ReceiptPrintView autoprint={autoprint} voucherId={voucherId} />
}
