import { createFileRoute } from '@tanstack/react-router'

import { PaymentReminderPage } from '#/features/tools/components/tool-pages.tsx'
import { buildToolHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/payment-reminder')({
  head: () => buildToolHead('payment-reminder'),
  component: PaymentReminderPage,
})
