import { createFileRoute } from '@tanstack/react-router'

import { CompaniesPanel } from '#/features/companies/components/companies-panel.tsx'

export const Route = createFileRoute('/app/masters/companies')({
  component: CompaniesRoute,
})

function CompaniesRoute() {
  return <CompaniesPanel />
}
