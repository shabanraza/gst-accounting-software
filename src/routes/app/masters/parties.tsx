import { createFileRoute } from '@tanstack/react-router'

import { PartiesPanel } from '#/features/parties/components/parties-panel.tsx'

export const Route = createFileRoute('/app/masters/parties')({
  component: PartiesRoute,
})

function PartiesRoute() {
  return <PartiesPanel />
}
