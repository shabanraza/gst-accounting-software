import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { VoucherDocumentPaper } from '#/features/documents/components/voucher-document-paper.tsx'
import { VoucherPrintToolbar } from '#/features/documents/components/voucher-print-toolbar.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { buildPurchaseBillPrintDocument } from '#/features/purchases/purchase-bill-print-service.ts'
import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type PurchaseBillPrintViewProps = {
  billId: string
  autoprint?: boolean
}

export function PurchaseBillPrintView({
  billId,
  autoprint,
}: PurchaseBillPrintViewProps) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()

  const billQuery = useQuery({
    ...trpc.purchases.getById.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      id: billId,
    }),
    enabled: Boolean(billId) && Boolean(companyId) && isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const bill = billQuery.data
  const supplier = (partiesQuery.data ?? []).find(
    (party) => party.id === bill?.supplierId,
  )
  const itemById = React.useMemo(
    () => new Map((itemsQuery.data ?? []).map((item) => [item.id, item])),
    [itemsQuery.data],
  )

  const printDoc = React.useMemo(() => {
    if (!bill || !company || !supplier) return null
    return buildPurchaseBillPrintDocument({
      bill,
      company: toPrintCompany(company),
      supplier: toPrintParty(supplier),
      itemById,
    })
  }, [bill, company, itemById, supplier])

  React.useEffect(() => {
    if (autoprint && printDoc) {
      const timer = window.setTimeout(() => window.print(), 300)
      return () => window.clearTimeout(timer)
    }
  }, [autoprint, printDoc])

  if (!printDoc) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading bill…</div>
    )
  }

  const fullPageHref = `/app/purchases/${billId}/print`

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-4 sm:p-6 print:max-w-none print:p-0">
      <VoucherPrintToolbar
        className="mb-4"
        fullPageHref={fullPageHref}
        pdfHref={`${fullPageHref}?autoprint=1`}
      />
      <VoucherDocumentPaper document={printDoc} />
    </div>
  )
}
