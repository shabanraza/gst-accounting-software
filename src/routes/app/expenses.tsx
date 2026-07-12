import { createFileRoute } from '@tanstack/react-router'

import { ExpensesPanel } from '#/features/expenses/components/expenses-panel.tsx'

export const Route = createFileRoute('/app/expenses')({
  component: ExpensesRoute,
})

function ExpensesRoute() {
  return <ExpensesPanel />
}
