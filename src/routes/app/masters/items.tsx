import { createFileRoute } from '@tanstack/react-router'

import { ItemsPanel } from '#/features/inventory/components/items-panel.tsx'

export const Route = createFileRoute('/app/masters/items')({
  component: ItemsRoute,
})

function ItemsRoute() {
  return <ItemsPanel />
}
