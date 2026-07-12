import { createFileRoute } from '@tanstack/react-router'

import { PurchaseGrnsPanel } from '#/features/purchases/components/purchase-grns-panel.tsx'

export const Route = createFileRoute('/app/purchase-grns')({
  component: PurchaseGrnsRoute,
})

function PurchaseGrnsRoute() {
  return <PurchaseGrnsPanel />
}
