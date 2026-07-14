import { createFileRoute } from '@tanstack/react-router'

import { JournalEntryPanel } from '#/features/accounting/components/journal-entry-panel.tsx'

export const Route = createFileRoute('/app/accounting/journal')({
  component: JournalRoute,
})

function JournalRoute() {
  return <JournalEntryPanel />
}
