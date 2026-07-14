import { createFileRoute } from '@tanstack/react-router'

import { PaymentsPanel } from '#/features/payments/components/payments-panel.tsx'

export const Route = createFileRoute('/app/payments')({
  component: PaymentsRoute,
})

function PaymentsRoute() {
  return <PaymentsPanel />
}
