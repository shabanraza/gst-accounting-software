import { createFileRoute } from '@tanstack/react-router'

import { BankReconciliationPanel } from '#/features/banking/components/bank-reconciliation-panel.tsx'

export const Route = createFileRoute('/app/bank-reconciliation')({
  component: BankReconciliationRoute,
})

function BankReconciliationRoute() {
  return <BankReconciliationPanel />
}
