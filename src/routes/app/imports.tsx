import { createFileRoute } from '@tanstack/react-router'

import { ImportsPanel } from '#/features/imports/components/imports-panel.tsx'

export const Route = createFileRoute('/app/imports')({
  component: ImportsRoute,
})

function ImportsRoute() {
  return <ImportsPanel />
}
