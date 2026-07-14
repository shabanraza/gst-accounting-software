import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { VoucherEntryPage } from '#/features/accounting/components/voucher-entry-page.tsx'

const searchSchema = z.object({
  fromDocument: z.string().uuid().optional(),
})

export const Route = createFileRoute('/app/sales/new')({
  validateSearch: searchSchema,
  component: NewSalesVoucherRoute,
})

function NewSalesVoucherRoute() {
  const { fromDocument } = Route.useSearch()

  return <VoucherEntryPage mode="sales" sourceDocumentId={fromDocument} />
}
