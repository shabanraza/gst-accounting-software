import { createFileRoute } from '@tanstack/react-router'

import { ChartOfAccountsPanel } from '#/features/accounting/components/chart-of-accounts-panel.tsx'

export const Route = createFileRoute('/app/masters/chart-of-accounts')({
  component: ChartOfAccountsRoute,
})

function ChartOfAccountsRoute() {
  return <ChartOfAccountsPanel />
}
