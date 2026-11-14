import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, PrinterIcon, SmartphoneIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { VoucherDocumentPaper } from '#/features/documents/components/voucher-document-paper.tsx'
import { formatIndianDate } from '#/features/documents/gst-invoice-format.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'

function StatusCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="mx-auto w-full max-w-md" data-ui="chrome">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function PaymentSummary({ document }: { document: VoucherPrintDocument }) {
  const isDue = Number(document.outstandingAmount) > 0

  return (
    <Card data-ui="chrome" size="hero">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-sm font-medium">
            {document.company.tradeName || document.company.legalName}
          </p>
          <p className="text-xs text-muted-foreground">
            {document.title} {document.documentNumber} ·{' '}
            {formatIndianDate(document.documentDate)}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {isDue ? (
            <div className="flex flex-col sm:items-end">
              <p className="text-xs text-muted-foreground">Amount due</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-money-in">
                {formatInr(document.outstandingAmount)}
              </p>
            </div>
          ) : (
            <Badge variant="success">Paid</Badge>
          )}
          {document.upiUri ? (
            <Button asChild className="sm:hidden" type="button">
              <a href={document.upiUri}>
                <SmartphoneIcon data-icon="inline-start" />
                Pay with UPI app
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function PublicInvoiceView({ token }: { token: string }) {
  const trpc = useTRPC()
  const invoiceQuery = useQuery({
    ...trpc.sales.publicInvoice.queryOptions({ token }),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const result = invoiceQuery.data
  const document = result?.status === 'active' ? result.document : null

  // The saved PDF takes its file name from the page title.
  React.useEffect(() => {
    if (!document) return
    window.document.title = `Invoice ${document.documentNumber} · ${
      document.company.tradeName || document.company.legalName
    }`
  }, [document])

  let content: React.ReactNode
  if (invoiceQuery.isPending) {
    content = (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading invoice…
      </p>
    )
  } else if (invoiceQuery.isError) {
    content = (
      <StatusCard
        description={getFormErrorMessage(
          invoiceQuery.error,
          'This invoice link is invalid or has expired.',
        )}
        title="Invoice unavailable"
      />
    )
  } else if (!document) {
    content = (
      <StatusCard
        description="The business that sent this link has cancelled the invoice."
        title="This invoice was cancelled"
      />
    )
  } else {
    content = (
      <>
        <div className="print:hidden">
          <PaymentSummary document={document} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <Button
            onClick={() => window.print()}
            type="button"
            variant="outline"
          >
            <DownloadIcon data-icon="inline-start" />
            Download PDF
          </Button>
          <Button onClick={() => window.print()} type="button">
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </div>
        <div
          className="overflow-x-auto rounded-lg shadow-(--elevation-1) print:overflow-visible print:rounded-none print:shadow-none"
          data-ui="data"
        >
          <div className="min-w-[720px] print:min-w-0">
            <VoucherDocumentPaper document={document} />
          </div>
        </div>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 print:max-w-none">
        {content}
      </div>
    </main>
  )
}
