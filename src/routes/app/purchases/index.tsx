import { createFileRoute } from '@tanstack/react-router'

import { PurchasesPanel } from '#/features/purchases/components/purchases-panel.tsx'

export const Route = createFileRoute('/app/purchases/')({
  component: PurchasesIndexRoute,
})

function PurchasesIndexRoute() {
  return <PurchasesPanel />
}
