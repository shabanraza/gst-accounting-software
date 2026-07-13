import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { VoucherDocumentPaper } from '#/features/documents/components/voucher-document-paper.tsx'
import { InvoiceShareActions } from '#/features/documents/components/invoice-share-actions.tsx'
import { VoucherPrintToolbar } from '#/features/documents/components/voucher-print-toolbar.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { buildInvoicePrintDocument } from '#/features/sales/invoice-print-service.ts'
import { buildPurchaseBillPrintDocument } from '#/features/purchases/purchase-bill-print-service.ts'
import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export type VoucherPreviewTarget =
  | { kind: 'sales'; id: string; number: string }
  | { kind: 'purchase'; id: string; number: string }

type VoucherPreviewSheetProps = {
  target: VoucherPreviewTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

export function VoucherPreviewSheet({
  target,
  open,
  onOpenChange,
  onDone,
}: VoucherPreviewSheetProps) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()

  const salesQuery = useQuery({
    ...trpc.sales.getById.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      id: target?.id ?? '',
    }),
    enabled:
      open &&
      target?.kind === 'sales' &&
      Boolean(target.id) &&
      Boolean(companyId) &&
      isReady,
  })
  const purchaseQuery = useQuery({
    ...trpc.purchases.getById.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      id: target?.id ?? '',
    }),
    enabled:
      open &&
      target?.kind === 'purchase' &&
      Boolean(target.id) &&
      Boolean(companyId) &&
      isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && open,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && open,
  })
  const eInvoiceQuery = useQuery({
    ...trpc.reports.getEInvoice.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      salesInvoiceId: target?.kind === 'sales' ? target.id : '',
    }),
    enabled:
      open &&
      target?.kind === 'sales' &&
      Boolean(target.id) &&
      Boolean(companyId) &&
      isReady,
  })

  const itemById = React.useMemo(
    () => new Map((itemsQuery.data ?? []).map((item) => [item.id, item])),
    [itemsQuery.data],
  )

  const printDocument = React.useMemo(() => {
    if (!target || !company) return null

    const companyInfo = toPrintCompany(company)

    if (target.kind === 'sales') {
      const invoice = salesQuery.data
      if (!invoice) return null
      const customer = (partiesQuery.data ?? []).find(
        (party) => party.id === invoice.customerId,
      )
      if (!customer) return null
      return buildInvoicePrintDocument({
        invoice,
        company: companyInfo,
        customer: toPrintParty(customer),
        itemById,
        eInvoice: eInvoiceQuery.data,
      })
    }

    const bill = purchaseQuery.data
    if (!bill) return null
    const supplier = (partiesQuery.data ?? []).find(
      (party) => party.id === bill.supplierId,
    )
    if (!supplier) return null
    return buildPurchaseBillPrintDocument({
      bill,
      company: companyInfo,
      supplier: toPrintParty(supplier),
      itemById,
    })
  }, [
    company,
    eInvoiceQuery.data,
    itemById,
    partiesQuery.data,
    purchaseQuery.data,
    salesQuery.data,
    target,
  ])

  const isLoading =
    !printDocument &&
    (salesQuery.isLoading ||
      purchaseQuery.isLoading ||
      partiesQuery.isLoading ||
      itemsQuery.isLoading)

  const fullPageHref =
    target?.kind === 'sales'
      ? `/app/sales/${target.id}/print`
      : target
        ? `/app/purchases/${target.id}/print`
        : '#'

  const pdfHref = `${fullPageHref}?autoprint=1`

  const listHref = target?.kind === 'sales' ? '/app/sales' : '/app/purchases'
  const createAnotherHref =
    target?.kind === 'sales' ? '/app/sales/new' : '/app/purchases/new'

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:w-[60vw] data-[side=right]:sm:max-w-[60vw]"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-start gap-3 pr-8">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-base">
                {target?.kind === 'sales' ? 'Invoice saved' : 'Bill saved'}
              </SheetTitle>
              <SheetDescription>
                {target?.number} · Preview matches what prints or exports as PDF.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b px-6 py-3">
            <VoucherPrintToolbar fullPageHref={fullPageHref} pdfHref={pdfHref} />
          </div>

          <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-background px-4 py-6 sm:px-6 sm:py-8">
            {isLoading ? (
              <div className="mx-auto flex aspect-[210/297] w-full max-w-[min(794px,calc(60vw-3rem))] shrink-0 items-center justify-center rounded-lg border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
                Loading preview…
              </div>
            ) : printDocument ? (
              <div className="mx-auto aspect-[210/297] w-full max-w-[min(794px,calc(60vw-3rem))] shrink-0">
                <VoucherDocumentPaper
                  className="h-full min-h-0 overflow-y-auto shadow-md print:h-auto print:overflow-visible"
                  document={printDocument}
                />
              </div>
            ) : (
              <div className="mx-auto flex aspect-[210/297] w-full max-w-[min(794px,calc(60vw-3rem))] shrink-0 items-center justify-center rounded-lg border border-dashed bg-background p-10 text-center text-sm text-destructive">
                Could not load voucher preview.
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap justify-end gap-2 border-t px-6 py-4">
          {target?.kind === 'sales' && printDocument && companyId ? (
            <InvoiceShareActions
              amount={printDocument.totalAmount}
              companyId={companyId}
              companyName={printDocument.company.legalName}
              invoiceId={target.id}
              invoiceNumber={target.number}
              printPath={fullPageHref}
            />
          ) : null}
          <Button
            onClick={() => {
              onOpenChange(false)
              onDone?.()
            }}
            type="button"
            variant="outline"
          >
            Close
          </Button>
          <Button asChild type="button" variant="secondary">
            <Link
              onClick={() => {
                onOpenChange(false)
                onDone?.()
              }}
              to={createAnotherHref}
            >
              Create another
            </Link>
          </Button>
          <Button asChild type="button">
            <Link
              onClick={() => {
                onOpenChange(false)
                onDone?.()
              }}
              to={listHref}
            >
              Back to register
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
