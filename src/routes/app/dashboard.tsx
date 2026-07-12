import { createFileRoute } from '@tanstack/react-router'

import { DashboardContent } from '#/features/app-shell/components/dashboard-content.tsx'

export const Route = createFileRoute('/app/dashboard')({
  component: DashboardRoute,
})

function DashboardRoute() {
  return <DashboardContent />
}
