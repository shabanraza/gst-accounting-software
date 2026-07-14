import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BanknoteIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import { paymentStatusBadgeIntent } from '#/lib/badge-intent.ts'

export function PaymentsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady } = useWorkspace()
  const [mode, setMode] = React.useState<'receipts' | 'payments'>('receipts')
  const [open, setOpen] = React.useState(false)
  const [documentId, setDocumentId] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10))

  const salesQuery = useQuery({
    ...trpc.sales.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const purchasesQuery = useQuery({
    ...trpc.purchases.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const allocateReceipt = useMutation(
    trpc.payments.allocateCustomerReceipt.mutationOptions(),
  )
  const allocatePayment = useMutation(
    trpc.payments.allocateSupplierPayment.mutationOptions(),
  )

  const partyName = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const openSales = (salesQuery.data ?? []).filter(
    (row) => row.paymentStatus !== 'Paid',
  )
  const openPurchases = (purchasesQuery.data ?? []).filter(
    (row) => row.paymentStatus !== 'Paid',
  )

  async function handleAllocate(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId) {
      toast.error('Workspace is still loading. Try again in a moment.')
      return
    }
    if (!documentId || !amount) {
      toast.error('Select a document and enter an amount.')
      return
    }
    try {
      if (mode === 'receipts') {
        if (
          !ledgerBySystemKey.cash ||
          !ledgerBySystemKey.customer_receivable
        ) {
          throw new Error('Cash / receivable ledgers missing')
        }
        await allocateReceipt.mutateAsync({
          companyId,
          invoiceId: documentId,
          amount,
          receiptDate: date,
          cashAccountId: ledgerBySystemKey.cash,
          receivableAccountId: ledgerBySystemKey.customer_receivable,
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.sales.list.queryKey({ companyId }),
        })
      } else {
        if (!ledgerBySystemKey.cash || !ledgerBySystemKey.supplier_payable) {
          throw new Error('Cash / payable ledgers missing')
        }
        await allocatePayment.mutateAsync({
          companyId,
          purchaseBillId: documentId,
          amount,
          paymentDate: date,
          cashAccountId: ledgerBySystemKey.cash,
          payableAccountId: ledgerBySystemKey.supplier_payable,
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.purchases.list.queryKey({ companyId }),
        })
      }
      setOpen(false)
      setDocumentId('')
      setAmount('')
      toast.success(
        mode === 'receipts' ? 'Receipt posted' : 'Payment posted',
      )
    } catch (err) {
      toastActionError(err, 'Allocation failed')
    }
  }

  return (
    <WorkspacePage
      actions={
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              {mode === 'receipts' ? 'Receive payment' : 'Make payment'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === 'receipts' ? 'Customer receipt' : 'Supplier payment'}
              </DialogTitle>
              <DialogDescription>
                Allocate amount against an open document and post to ledger.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleAllocate}>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Document</span>
                {(mode === 'receipts' ? openSales : openPurchases).length ===
                0 ? (
                  <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                    {mode === 'receipts'
                      ? 'No open credit invoices. Create a credit sale first.'
                      : 'No open purchase bills with balance due.'}
                  </p>
                ) : (
                  <Select onValueChange={setDocumentId} value={documentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {mode === 'receipts'
                          ? openSales.map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.invoiceNumber} · due{' '}
                                {formatInr(row.outstandingAmount)}
                              </SelectItem>
                            ))
                          : openPurchases.map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.supplierBillNumber} · due{' '}
                                {formatInr(row.outstandingAmount)}
                              </SelectItem>
                            ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="pay-amt">
                    Amount
                  </label>
                  <Input
                    id="pay-amt"
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    value={amount}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="pay-date">
                    Date
                  </label>
                  <Input
                    id="pay-date"
                    onChange={(event) => setDate(event.target.value)}
                    required
                    type="date"
                    value={date}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    (mode === 'receipts' ? openSales : openPurchases).length ===
                    0
                  }
                  type="submit"
                >
                  Post allocation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      description="Customer receipts and supplier payments against open invoices and bills."
      title="Payments"
    >
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <BanknoteIcon className="size-4 text-muted-foreground" />
              Open balances
            </CardTitle>
            <CardDescription>
              Allocate receipts and payments to update Paid / Part paid status
            </CardDescription>
          </div>
          <Tabs
            onValueChange={(value) =>
              setMode(value as 'receipts' | 'payments')
            }
            value={mode}
          >
            <TabsList>
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mode === 'receipts'
                ? openSales.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.invoiceNumber}
                      </TableCell>
                      <TableCell>{partyName(row.customerId)}</TableCell>
                      <TableCell>{formatInr(row.totalAmount)}</TableCell>
                      <TableCell>
                        {formatInr(row.outstandingAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusBadgeIntent(row.paymentStatus)}>
                          {row.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                : openPurchases.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.supplierBillNumber}
                      </TableCell>
                      <TableCell>{partyName(row.supplierId)}</TableCell>
                      <TableCell>{formatInr(row.totalAmount)}</TableCell>
                      <TableCell>
                        {formatInr(row.outstandingAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusBadgeIntent(row.paymentStatus)}>
                          {row.paymentStatus}
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
    </WorkspacePage>
  )
}
