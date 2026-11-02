import { createFileRoute } from '@tanstack/react-router'

import { ItemLabelsPage } from '#/features/inventory/components/item-labels-page.tsx'

export const Route = createFileRoute('/app/masters/item-labels')({
  component: ItemLabelsRoute,
})

function ItemLabelsRoute() {
  return <ItemLabelsPage />
}
