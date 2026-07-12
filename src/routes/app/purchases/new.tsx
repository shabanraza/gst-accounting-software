import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { VoucherEntryPage } from '#/features/accounting/components/voucher-entry-page.tsx'

const searchSchema = z.object({
  fromGrn: z.string().uuid().optional(),
})

export const Route = createFileRoute('/app/purchases/new')({
  validateSearch: searchSchema,
  component: NewPurchaseVoucherRoute,
})

function NewPurchaseVoucherRoute() {
  const { fromGrn } = Route.useSearch()

  return <VoucherEntryPage mode="purchase" sourceGrnId={fromGrn} />
}
