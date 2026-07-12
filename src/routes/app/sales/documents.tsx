import { createFileRoute } from '@tanstack/react-router'

import { SalesDocumentsPanel } from '#/features/sales-documents/components/sales-documents-panel.tsx'

export const Route = createFileRoute('/app/sales/documents')({
  component: SalesDocumentsRoute,
})

function SalesDocumentsRoute() {
  return <SalesDocumentsPanel />
}
