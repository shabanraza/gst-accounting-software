import { createFileRoute } from '@tanstack/react-router'

import { InventoryPanel } from '#/features/inventory/components/inventory-panel.tsx'

export const Route = createFileRoute('/app/inventory')({
  component: InventoryRoute,
})

function InventoryRoute() {
  return <InventoryPanel />
}
