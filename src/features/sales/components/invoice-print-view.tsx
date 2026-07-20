import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { VoucherDocumentPaper } from '#/features/documents/components/voucher-document-paper.tsx'
import { VoucherPrintToolbar } from '#/features/documents/components/voucher-print-toolbar.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { buildInvoicePrintDocument } from '#/features/sales/invoice-print-service.ts'
import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'

type InvoicePrintViewProps = {
  invoiceId: string
  autoprint?: boolean
  initialDocument?: VoucherPrintDocument | null
}

export function InvoicePrintView({
  invoiceId,
  autoprint,
  initialDocument,
}: InvoicePrintViewProps) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()

  const invoiceQuery = useQuery({
    ...trpc.sales.getById.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      id: invoiceId,
    }),
    enabled:
      !initialDocument && Boolean(invoiceId) && Boolean(companyId) && isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: !initialDocument && Boolean(companyId) && isReady,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: !initialDocument && Boolean(companyId) && isReady,
  })

  const invoice = invoiceQuery.data
  const customer = (partiesQuery.data ?? []).find(
    (party) => party.id === invoice?.customerId,
  )
  const itemById = React.useMemo(
    () => new Map((itemsQuery.data ?? []).map((item) => [item.id, item])),
    [itemsQuery.data],
  )

  const printDoc = React.useMemo(() => {
    if (initialDocument) return initialDocument
    if (!invoice || !company || !customer) return null
    return buildInvoicePrintDocument({
      invoice,
      company: toPrintCompany(company),
      customer: toPrintParty(customer),
      itemById,
    })
  }, [company, customer, initialDocument, invoice, itemById])

  React.useEffect(() => {
    if (autoprint && printDoc) {
      const timer = window.setTimeout(() => window.print(), 300)
      return () => window.clearTimeout(timer)
    }
  }, [autoprint, printDoc])

  if (!printDoc) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading invoice…</div>
    )
  }

  const fullPageHref = `/app/sales/${invoiceId}/print`

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
