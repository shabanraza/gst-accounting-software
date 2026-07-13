import { createFileRoute } from '@tanstack/react-router'

import { GodownsPanel } from '#/features/inventory/components/godowns-panel.tsx'

export const Route = createFileRoute('/app/masters/godowns')({
  component: GodownsRoute,
})

function GodownsRoute() {
  return <GodownsPanel />
}
