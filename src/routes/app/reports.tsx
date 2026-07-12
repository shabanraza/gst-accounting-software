import { createFileRoute } from '@tanstack/react-router'

import { ReportsPanel } from '#/features/gst/components/reports-panel.tsx'

export const Route = createFileRoute('/app/reports')({
  component: ReportsRoute,
})

function ReportsRoute() {
  return <ReportsPanel />
}
