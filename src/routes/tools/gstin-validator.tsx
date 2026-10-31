import { createFileRoute } from '@tanstack/react-router'

import { GstinValidatorPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/gstin-validator')({
  head: () => buildToolHead('gstin-validator'),
  component: GstinValidatorPage,
})
