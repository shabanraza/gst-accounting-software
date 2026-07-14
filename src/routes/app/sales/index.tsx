import { createFileRoute } from '@tanstack/react-router'

import { SalesPanel } from '#/features/sales/components/sales-panel.tsx'

export const Route = createFileRoute('/app/sales/')({
  component: SalesIndexRoute,
})

function SalesIndexRoute() {
  return <SalesPanel />
}
