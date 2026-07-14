import { createFileRoute } from '@tanstack/react-router'

import { ReturnsPanel } from '#/features/returns/components/returns-panel.tsx'

export const Route = createFileRoute('/app/returns')({
  component: ReturnsRoute,
})

function ReturnsRoute() {
  return <ReturnsPanel />
}
