import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { VoucherEntryPage } from '#/features/accounting/components/voucher-entry-page.tsx'
import { consumeGstr2bPurchasePrefill } from '#/features/gst/gstr2b-purchase-prefill.ts'

const searchSchema = z.object({
  fromGrn: z.string().uuid().optional(),
  supplierBillNumber: z.string().optional(),
  billDate: z.string().optional(),
  taxableAmount: z.string().optional(),
})

export const Route = createFileRoute('/app/purchases/new')({
  validateSearch: searchSchema,
  component: NewPurchaseVoucherRoute,
})

function NewPurchaseVoucherRoute() {
  const search = Route.useSearch()
  const sessionPrefill = consumeGstr2bPurchasePrefill()

  const gstr2bPrefill =
    sessionPrefill ??
    (search.supplierBillNumber
      ? {
          supplierBillNumber: search.supplierBillNumber,
          billDate: search.billDate,
          taxableAmount: search.taxableAmount,
        }
      : undefined)

  return (
    <VoucherEntryPage
      gstr2bPrefill={gstr2bPrefill}
      mode="purchase"
      sourceGrnId={search.fromGrn}
    />
  )
}
