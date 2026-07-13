import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BanIcon,
  EyeIcon,
  FileCheckIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  TruckIcon,
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
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
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
  const [actionError, setActionError] = React.useState<string | null>(null)

  const salesQuery = useQuery({
    ...trpc.sales.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const cancelInvoiceMutation = useMutation({
    ...trpc.sales.cancelInvoice.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.sales.list.queryKey(),
      })
    },
  })
  const generateEInvoiceMutation = useMutation(
    trpc.reports.generateEInvoice.mutationOptions(),
  )
  const generateEWayBillMutation = useMutation(
    trpc.reports.generateEWayBill.mutationOptions(),
  )
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const partyName = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const rows = salesQuery.data ?? []
  const filtered = rows.filter((row) => {
    const matchesFilter = filter === 'all' || row.paymentStatus === filter
    const haystack =
      `${row.invoiceNumber} ${partyName(row.customerId)}`.toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })

  function openPreview(row: { id: string; invoiceNumber: string }) {
    setPreviewTarget({
      kind: 'sales',
      id: row.id,
      number: row.invoiceNumber,
    })
    setPreviewOpen(true)
  }

  async function handleGenerateIrn(row: {
    id: string
    totalAmount: string
  }) {
    if (!companyId) return
    setActionError(null)
    try {
      await generateEInvoiceMutation.mutateAsync({
        companyId,
        salesInvoiceId: row.id,
        totalAmount: row.totalAmount,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.reports.getEInvoice.queryKey({
          companyId,
          salesInvoiceId: row.id,
        }),
      })
    } catch (err) {
      setActionError(getFormErrorMessage(err, 'Failed to generate IRN'))
    }
  }

  async function handleGenerateEWay(row: { id: string }) {
    if (!companyId) return
    setActionError(null)
    try {
      await generateEWayBillMutation.mutateAsync({
        companyId,
        salesInvoiceId: row.id,
      })
    } catch (err) {
      setActionError(getFormErrorMessage(err, 'Failed to generate e-way bill'))
    }
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
        {actionError ? (
          <p className="text-sm text-destructive">{actionError}</p>
        ) : null}
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No sales yet. Create a sales voucher.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
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
                      {row.status === 'cancelled' ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : row.paymentStatus === 'Paid' ? (
                        <Badge variant="success">Paid</Badge>
                      ) : row.paymentStatus === 'Part paid' ? (
                        <Badge variant="warning">Part paid</Badge>
                      ) : (
                        <Badge variant="info">Pending</Badge>
                      )}
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
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  disabled={generateEInvoiceMutation.isPending}
                                  onClick={() => handleGenerateIrn(row)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <FileCheckIcon />
                                  <span className="sr-only">Generate IRN</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate IRN</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  disabled={generateEWayBillMutation.isPending}
                                  onClick={() => handleGenerateEWay(row)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <TruckIcon />
                                  <span className="sr-only">
                                    Generate e-way bill
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate e-way</TooltipContent>
                            </Tooltip>
                          </>
                        )}
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
