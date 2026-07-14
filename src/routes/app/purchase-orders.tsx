import { createFileRoute } from '@tanstack/react-router'

import { PurchaseOrdersPanel } from '#/features/purchases/components/purchase-orders-panel.tsx'

export const Route = createFileRoute('/app/purchase-orders')({
  component: PurchaseOrdersRoute,
})

function PurchaseOrdersRoute() {
  return <PurchaseOrdersPanel />
}
