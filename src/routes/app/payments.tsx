import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PaymentsPanel } from '#/features/payments/components/payments-panel.tsx'

const searchSchema = z.object({
  mode: z.enum(['receipts', 'payments']).optional().catch(undefined),
})

export const Route = createFileRoute('/app/payments')({
  validateSearch: searchSchema,
  component: PaymentsRoute,
})

function PaymentsRoute() {
  const { mode } = Route.useSearch()
  // Keyed so a quick action from another tab switches the open tab.
  return <PaymentsPanel initialMode={mode} key={mode ?? 'receipts'} />
}
