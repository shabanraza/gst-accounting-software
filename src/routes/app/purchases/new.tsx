import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { VoucherEntryPage } from '#/features/accounting/components/voucher-entry-page.tsx'

const searchSchema = z.object({
  fromGrn: z.string().uuid().optional(),
  supplierGstin: z.string().optional(),
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

  return (
    <VoucherEntryPage
      gstr2bPrefill={
        search.supplierBillNumber
          ? {
              supplierGstin: search.supplierGstin,
              supplierBillNumber: search.supplierBillNumber,
              billDate: search.billDate,
              taxableAmount: search.taxableAmount,
            }
          : undefined
      }
      mode="purchase"
      sourceGrnId={search.fromGrn}
    />
  )
}
