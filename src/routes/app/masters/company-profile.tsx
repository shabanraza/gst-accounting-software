import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { CompanyProfilePanel } from '#/features/companies/components/company-profile-panel.tsx'

export const Route = createFileRoute('/app/masters/company-profile')({
  component: CompanyProfileRoute,
})

function CompanyProfileRoute() {
  return (
    <WorkspacePage
      description="Registered address, GST/PAN, bank details, and invoice terms for print and PDF."
      title="Company profile"
    >
      <CompanyProfilePanel />
    </WorkspacePage>
  )
}
