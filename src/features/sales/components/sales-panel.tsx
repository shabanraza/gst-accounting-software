import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  BanIcon,
  EyeIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
} from 'lucide-react'

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
import { Input } from '#/components/ui/input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { VoucherPreviewSheet } from '#/features/documents/components/voucher-preview-sheet.tsx'
import type { VoucherPreviewTarget } from '#/features/documents/components/voucher-preview-sheet.tsx'
import {
  nextVoucherListCursor,
  VOUCHER_LIST_PAGE_SIZE,
} from '#/features/documents/voucher-list-pagination.ts'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { invoiceStatusBadgeIntent } from '#/lib/badge-intent.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function SalesPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<
    'all' | 'Paid' | 'Part paid' | 'Pending'
  >('all')
  const [previewTarget, setPreviewTarget] =
    React.useState<VoucherPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [cancelTarget, setCancelTarget] = React.useState<{
    id: string
    invoiceNumber: string
  } | null>(null)
  const resolvedCompanyId = companyId ?? '00000000-0000-4000-8000-000000000099'
  const salesQuery = useInfiniteQuery(
    trpc.sales.list.infiniteQueryOptions(
      {
        companyId: resolvedCompanyId,
        limit: VOUCHER_LIST_PAGE_SIZE,
        paymentStatus: filter === 'all' ? undefined : filter,
        search: query.trim() || undefined,
      },
      {
        enabled: Boolean(companyId) && isReady,
        getNextPageParam: (lastPage) =>
          nextVoucherListCursor(
            lastPage,
            VOUCHER_LIST_PAGE_SIZE,
            (row) => row.invoiceDate,
          ),
      },
    ),
  )
  const cancelInvoiceMutation = useMutation({
    ...trpc.sales.cancelInvoice.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.sales.list.queryKey(),
      })
    },
    onError: (error) => {
      toastActionError(error, 'Failed to cancel invoice')
    },
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: resolvedCompanyId,
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const partyName = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const rows = salesQuery.data?.pages.flat() ?? []

  function openPreview(row: { id: string; invoiceNumber: string }) {
    setPreviewTarget({
      kind: 'sales',
      id: row.id,
      number: row.invoiceNumber,
    })
    setPreviewOpen(true)
  }

  return (
    <WorkspacePage
      actions={
        <Button asChild>
          <Link to="/app/sales/new">
            <PlusIcon data-icon="inline-start" />
            New sales bill
          </Link>
        </Button>
      }
      description="Sales register from posted invoices."
      title="Sales"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            onValueChange={(value) =>
              setFilter(value as 'all' | 'Paid' | 'Part paid' | 'Pending')
            }
            value={filter}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Part paid">Part paid</TabsTrigger>
              <TabsTrigger value="Paid">Paid</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoice or party"
              value={query}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesQuery.isLoading ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={8}
                >
                  Loading sales…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={8}
                >
                  No sales yet. Create a sales voucher.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.invoiceNumber}
                  </TableCell>
                  <TableCell>{partyName(row.customerId)}</TableCell>
                  <TableCell>{row.invoiceDate}</TableCell>
                  <TableCell>{formatInr(row.taxableAmount)}</TableCell>
                  <TableCell>{formatInr(row.totalGstAmount)}</TableCell>
                  <TableCell>{formatInr(row.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={invoiceStatusBadgeIntent({
                        cancelled: row.status === 'cancelled',
                        paymentStatus: row.paymentStatus,
                      })}
                    >
                      {row.status === 'cancelled'
                        ? 'Cancelled'
                        : row.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => openPreview(row)}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <EyeIcon />
                            <span className="sr-only">Preview invoice</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild size="icon-sm" variant="ghost">
                            <Link
                              params={{ invoiceId: row.id }}
                              to="/app/sales/$invoiceId/print"
                            >
                              <PrinterIcon />
                              <span className="sr-only">Print invoice</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Print</TooltipContent>
                      </Tooltip>
                      {row.status === 'cancelled' ? null : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={cancelInvoiceMutation.isPending}
                              onClick={() =>
                                setCancelTarget({
                                  id: row.id,
                                  invoiceNumber: row.invoiceNumber,
                                })
                              }
                              size="icon-sm"
                              variant="ghost"
                            >
                              <BanIcon />
                              <span className="sr-only">Cancel invoice</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancel</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {salesQuery.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              disabled={salesQuery.isFetchingNextPage}
              onClick={() => void salesQuery.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {salesQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </div>

      <VoucherPreviewSheet
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        target={previewTarget}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
        open={cancelTarget !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel invoice {cancelTarget?.invoiceNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the ledger and stock postings and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) {
                  cancelInvoiceMutation.mutate({
                    companyId: companyId ?? '',
                    id: cancelTarget.id,
                  })
                }
                setCancelTarget(null)
              }}
            >
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  )
}
