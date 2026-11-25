import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  FilePlusIcon,
  PauseIcon,
  PlayIcon,
  Repeat2Icon,
  SquareIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { frequencyLabels } from '#/features/sales/components/repeat-invoice-dialog.tsx'
import { isRecurringDue } from '#/features/sales/recurring-invoice-service.ts'
import { recurringInvoiceBadgeIntent } from '#/lib/badge-intent.ts'
import { formatShortDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { RecurringInvoiceRecord } from '#/features/sales/recurring-invoice-service.ts'

function statusLabel(record: RecurringInvoiceRecord, due: boolean) {
  if (record.status === 'ended') return 'Ended'
  if (record.status === 'paused') return 'Paused'
  return due ? 'Due' : 'Active'
}

export function RecurringInvoicesPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [stopTarget, setStopTarget] =
    React.useState<RecurringInvoiceRecord | null>(null)
  const listQuery = useQuery(
    trpc.recurringInvoices.list.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )
  const generate = useMutation(
    trpc.recurringInvoices.generate.mutationOptions(),
  )
  const setStatus = useMutation(
    trpc.recurringInvoices.setStatus.mutationOptions(),
  )

  const today = listQuery.data?.today ?? ''
  const records = listQuery.data?.records ?? []

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.recurringInvoices.list.pathKey(),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.sales.list.pathKey() }),
    ])
  }

  async function handleGenerate(record: RecurringInvoiceRecord) {
    if (!companyId) return
    try {
      const { invoice } = await generate.mutateAsync({
        companyId,
        id: record.id,
      })
      await refresh()
      toast.success(`Invoice ${invoice.invoiceNumber} created`, {
        action: (
          <Button asChild size="sm" variant="outline">
            <Link
              params={{ invoiceId: invoice.id }}
              to="/app/sales/$invoiceId/print"
            >
              Open
            </Link>
          </Button>
        ),
      })
    } catch (error) {
      toastActionError(error, 'Could not create the invoice')
    }
  }

  async function handleStatus(
    record: RecurringInvoiceRecord,
    status: 'active' | 'paused' | 'ended',
  ) {
    if (!companyId) return
    try {
      await setStatus.mutateAsync({ companyId, id: record.id, status })
      await refresh()
    } catch (error) {
      toastActionError(error, 'Could not update the recurring invoice')
    }
  }

  const busy = generate.isPending || setStatus.isPending

  return (
    <WorkspacePage
      description="Invoices that repeat for the same customer on a schedule."
      title="Recurring invoices"
    >
      {listQuery.isSuccess && records.length === 0 ? (
        <Empty data-hero-surface data-ui="chrome">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Repeat2Icon className="icon-duotone" />
            </EmptyMedia>
            <EmptyTitle>No recurring invoices yet</EmptyTitle>
            <EmptyDescription>
              Pick the repeat icon on a sales invoice to bill the same customer
              every week, month, quarter or year.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/app/sales">Go to sales invoices</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div data-ui="data">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Repeats</TableHead>
                <TableHead>Next invoice</TableHead>
                <TableHead className="hidden md:table-cell">
                  Last invoice
                </TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const due = isRecurringDue(record, today)
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="truncate">{record.customerName}</span>
                        <span className="text-xs text-muted-foreground md:hidden">
                          {frequencyLabels[record.frequency]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {frequencyLabels[record.frequency]}
                      {record.endDate
                        ? ` until ${formatShortDate(record.endDate)}`
                        : ''}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {record.status === 'ended'
                        ? '—'
                        : formatShortDate(record.nextRunDate)}
                    </TableCell>
                    <TableCell className="hidden font-mono tabular-nums md:table-cell">
                      {record.lastInvoiceId ? (
                        <Link
                          className="underline-offset-4 hover:underline"
                          params={{ invoiceId: record.lastInvoiceId }}
                          to="/app/sales/$invoiceId/print"
                        >
                          {record.lastInvoiceNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatInr(record.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={recurringInvoiceBadgeIntent({
                          status: record.status,
                          due,
                        })}
                      >
                        {statusLabel(record, due)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {due ? (
                          <Button
                            disabled={busy}
                            onClick={() => void handleGenerate(record)}
                            size="sm"
                            type="button"
                          >
                            <FilePlusIcon data-icon="inline-start" />
                            Create invoice
                          </Button>
                        ) : null}
                        {record.status === 'active' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  void handleStatus(record, 'paused')
                                }
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <PauseIcon />
                                <span className="sr-only">Pause</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Pause</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {record.status === 'paused' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  void handleStatus(record, 'active')
                                }
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <PlayIcon />
                                <span className="sr-only">Resume</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resume</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {record.status === 'ended' ? null : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={busy}
                                onClick={() => setStopTarget(record)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <SquareIcon />
                                <span className="sr-only">Stop</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Stop</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setStopTarget(null)
        }}
        open={stopTarget !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Stop repeating for {stopTarget?.customerName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              No more invoices will be created from it. Invoices already created
              stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (stopTarget) void handleStatus(stopTarget, 'ended')
                setStopTarget(null)
              }}
            >
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  )
}
