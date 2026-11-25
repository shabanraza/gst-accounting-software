import { createFileRoute } from '@tanstack/react-router'

import { RecurringInvoicesPanel } from '#/features/sales/components/recurring-invoices-panel.tsx'

export const Route = createFileRoute('/app/sales/recurring')({
  component: RecurringInvoicesRoute,
})

function RecurringInvoicesRoute() {
  return <RecurringInvoicesPanel />
}
