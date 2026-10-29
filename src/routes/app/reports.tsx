import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ReportsPanel } from '#/features/gst/components/reports-panel.tsx'

const searchSchema = z.object({
  tab: z.enum(['gstr3b', 'ageing']).optional().catch(undefined),
})

export const Route = createFileRoute('/app/reports')({
  validateSearch: searchSchema,
  component: ReportsRoute,
})

function ReportsRoute() {
  const { tab } = Route.useSearch()
  return <ReportsPanel initialTab={tab} key={tab ?? 'gstr1'} />
}
