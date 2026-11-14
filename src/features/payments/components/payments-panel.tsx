import * as React from 'react'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  BanknoteIcon,
  BookOpenIcon,
  PlusIcon,
  PrinterIcon,
  XIcon,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { ScrollableTabsList } from '#/components/ui/scrollable-tabs-list.tsx'
import { Tabs, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatIndianDate } from '#/features/documents/gst-invoice-format.ts'
import {
  MODE_LABELS,
  PaymentVoucherSheet,
} from '#/features/payments/components/payment-voucher-sheet.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import {
  paymentStatusBadgeIntent,
  paymentVoucherStatusBadgeIntent,
} from '#/lib/badge-intent.ts'

type CancelTarget = { id: string; voucherNumber: string }

export function PaymentsPanel({
  initialMode,
}: {
  initialMode?: 'receipts' | 'payments'
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [mode, setMode] = React.useState<'receipts' | 'payments'>(
    initialMode ?? 'receipts',
  )
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [cancelTarget, setCancelTarget] = React.useState<CancelTarget | null>(
    null,
  )
  const kind = mode === 'receipts' ? 'receipt' : 'payment'
  const enabled = Boolean(companyId && isReady)

  const vouchersQuery = useQuery(
    trpc.payments.list.queryOptions(
      enabled && companyId ? { companyId, kind } : skipToken,
    ),
  )
  const salesQuery = useQuery(
    trpc.sales.list.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )
  const purchasesQuery = useQuery(
    trpc.purchases.list.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )
  const partiesQuery = useQuery(
    trpc.parties.list.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )

  const cancelVoucher = useMutation(
    trpc.payments.cancel.mutationOptions({
      onSuccess: async (voucher) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.payments.list.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.sales.list.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.purchases.list.pathKey(),
          }),
        ])
        toast.success(`${voucher.voucherNumber} cancelled`)
      },
      onError: (error) => toastActionError(error, 'Cancel failed'),
    }),
  )

  const partyName = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const vouchers = vouchersQuery.data ?? []
  const openSales = (salesQuery.data ?? []).filter(
    (row) => row.status !== 'cancelled' && row.paymentStatus !== 'Paid',
  )
  const openPurchases = (purchasesQuery.data ?? []).filter(
    (row) => row.paymentStatus !== 'Paid',
  )
  const amountTone = mode === 'receipts' ? 'text-money-in' : 'text-money-out'

  return (
    <WorkspacePage
      actions={
        <Button onClick={() => setSheetOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          {mode === 'receipts' ? 'New receipt' : 'New payment'}
        </Button>
      }
      description="Customer receipts and supplier payments, by cash, bank, UPI or cheque."
      title="Receipts & payments"
    >
      <Tabs
        onValueChange={(value) => setMode(value as 'receipts' | 'payments')}
        value={mode}
      >
        <ScrollableTabsList>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </ScrollableTabsList>
      </Tabs>

      <Card data-ui="data">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenIcon className="size-4 text-muted-foreground" />
            {mode === 'receipts' ? 'Receipt register' : 'Payment register'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="hidden md:table-cell">Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Advance
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => {
                const cancelled = voucher.status === 'cancelled'
                return (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono font-medium">
                      {voucher.voucherNumber}
                      <span className="block font-sans text-xs font-normal text-muted-foreground sm:hidden">
                        {formatIndianDate(voucher.voucherDate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatIndianDate(voucher.voucherDate)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {partyName(voucher.partyId)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {MODE_LABELS[voucher.mode]}
                      {voucher.reference ? (
                        <span className="text-muted-foreground">
                          {' '}
                          · {voucher.reference}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${cancelled ? 'text-muted-foreground line-through' : amountTone}`}
                    >
                      {formatInr(voucher.amount)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">
                      {Number(voucher.unallocatedAmount) > 0 && !cancelled
                        ? formatInr(voucher.unallocatedAmount)
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={paymentVoucherStatusBadgeIntent(
                          voucher.status,
                        )}
                      >
                        {cancelled ? 'Cancelled' : 'Posted'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          asChild
                          size="icon-sm"
                          title="Print"
                          variant="ghost"
                        >
                          <Link
                            params={{ voucherId: voucher.id }}
                            to="/app/payments/$voucherId/print"
                          >
                            <PrinterIcon />
                            <span className="sr-only">
                              Print {voucher.voucherNumber}
                            </span>
                          </Link>
                        </Button>
                        {cancelled ? null : (
                          <Button
                            onClick={() =>
                              setCancelTarget({
                                id: voucher.id,
                                voucherNumber: voucher.voucherNumber,
                              })
                            }
                            size="icon-sm"
                            title="Cancel"
                            variant="ghost"
                          >
                            <XIcon />
                            <span className="sr-only">
                              Cancel {voucher.voucherNumber}
                            </span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {vouchers.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    {mode === 'receipts'
                      ? 'No receipts yet.'
                      : 'No payments yet.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card data-ui="data">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BanknoteIcon className="size-4 text-muted-foreground" />
            Open balances
          </CardTitle>
          <CardDescription>
            {mode === 'receipts'
              ? 'Invoices with an amount still due'
              : 'Bills with an amount still due'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Total
                </TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(mode === 'receipts'
                ? openSales.map((row) => ({
                    id: row.id,
                    number: row.invoiceNumber,
                    partyId: row.customerId,
                    total: row.totalAmount,
                    outstanding: row.outstandingAmount,
                    status: row.paymentStatus,
                  }))
                : openPurchases.map((row) => ({
                    id: row.id,
                    number: row.supplierBillNumber,
                    partyId: row.supplierId,
                    total: row.totalAmount,
                    outstanding: row.outstandingAmount,
                    status: row.paymentStatus,
                  }))
              ).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.number}</TableCell>
                  <TableCell className="max-w-40 truncate">
                    {partyName(row.partyId)}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                    {formatInr(row.total)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-medium tabular-nums ${amountTone}`}
                  >
                    {formatInr(row.outstanding)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={paymentStatusBadgeIntent(row.status)}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(mode === 'receipts' ? openSales : openPurchases).length ===
              0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No open documents.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentVoucherSheet
        key={kind}
        kind={kind}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
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
              Cancel {cancelTarget?.voucherNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The entry is reversed and adjusted bills get their balance back.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep voucher</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget && companyId) {
                  cancelVoucher.mutate({ companyId, id: cancelTarget.id })
                }
                setCancelTarget(null)
              }}
            >
              Cancel voucher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  )
}
