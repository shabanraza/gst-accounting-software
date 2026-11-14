import * as React from 'react'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { WandSparklesIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatIndianDate } from '#/features/documents/gst-invoice-format.ts'
import {
  allocateOldestFirst,
  draftToAllocations,
  summariseAllocation,
} from '#/features/payments/allocation-plan.ts'
import { formatInr } from '#/lib/format-inr.ts'
import {
  requirePositiveAmount,
  requireSelection,
  requireWorkspace,
} from '#/lib/form-validation.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { AllocationDraft } from '#/features/payments/allocation-plan.ts'
import type {
  PaymentVoucherKind,
  PaymentVoucherMode,
} from '#/features/payments/payment-voucher-service.ts'

export const MODE_LABELS: Record<PaymentVoucherMode, string> = {
  cash: 'Cash',
  bank: 'Bank transfer',
  upi: 'UPI',
  cheque: 'Cheque',
}

const today = () => new Date().toISOString().slice(0, 10)

export function PaymentVoucherSheet({
  kind,
  open,
  onOpenChange,
}: {
  kind: PaymentVoucherKind
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady } = useWorkspace()
  const enabled = Boolean(companyId && isReady && open)

  const [partyId, setPartyId] = React.useState('')
  const [voucherDate, setVoucherDate] = React.useState(today)
  const [mode, setMode] = React.useState<PaymentVoucherMode>('cash')
  const [accountId, setAccountId] = React.useState(ledgerBySystemKey.cash ?? '')
  const [reference, setReference] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [narration, setNarration] = React.useState('')
  const [draft, setDraft] = React.useState<AllocationDraft>({})

  const partiesQuery = useQuery(
    trpc.parties.list.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )
  const accountsQuery = useQuery(
    trpc.accounting.listLedgerAccounts.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )
  const invoicesQuery = useQuery(
    trpc.sales.list.queryOptions(
      enabled && companyId && partyId && kind === 'receipt'
        ? { companyId, partyId }
        : skipToken,
    ),
  )
  const billsQuery = useQuery(
    trpc.purchases.list.queryOptions(
      enabled && companyId && partyId && kind === 'payment'
        ? { companyId, partyId }
        : skipToken,
    ),
  )

  const parties = (partiesQuery.data ?? []).filter((party) =>
    kind === 'receipt'
      ? party.partyType !== 'supplier'
      : party.partyType !== 'customer',
  )
  const cashBankAccounts = (accountsQuery.data ?? []).filter(
    (account) =>
      account.accountType === 'asset' &&
      (account.systemKey === null ||
        account.systemKey === 'cash' ||
        account.systemKey === 'bank'),
  )
  const openDocuments =
    kind === 'receipt'
      ? (invoicesQuery.data ?? [])
          .filter(
            (row) =>
              row.status !== 'cancelled' && Number(row.outstandingAmount) > 0,
          )
          .map((row) => ({
            id: row.id,
            number: row.invoiceNumber,
            date: row.invoiceDate,
            outstanding: row.outstandingAmount,
          }))
      : (billsQuery.data ?? [])
          .filter((row) => Number(row.outstandingAmount) > 0)
          .map((row) => ({
            id: row.id,
            number: row.supplierBillNumber,
            date: row.billDate,
            outstanding: row.outstandingAmount,
          }))
  const summary = summariseAllocation(amount, draft)

  const post = useMutation(trpc.payments.post.mutationOptions())

  function reset() {
    setPartyId('')
    setVoucherDate(today())
    setMode('cash')
    setAccountId(ledgerBySystemKey.cash ?? '')
    setReference('')
    setAmount('')
    setNarration('')
    setDraft({})
  }

  function changeMode(next: PaymentVoucherMode) {
    setMode(next)
    const fallback =
      next === 'cash' ? ledgerBySystemKey.cash : ledgerBySystemKey.bank
    if (fallback) setAccountId(fallback)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!requireWorkspace(companyId, isReady) || !companyId) return
    const party = requireSelection(partyId, 'a party')
    if (!party) return
    const account = requireSelection(accountId, 'a cash or bank ledger')
    if (!account) return
    const value = requirePositiveAmount(amount, 'Amount')
    if (!value) return
    if (summary.overAllocated) {
      toast.error('Adjusted total is more than the amount.')
      return
    }

    try {
      const voucher = await post.mutateAsync({
        companyId,
        kind,
        partyId: party,
        voucherDate,
        mode,
        cashBankAccountId: account,
        reference: mode === 'cash' ? '' : reference,
        amount: value,
        narration,
        allocations: draftToAllocations(draft),
      })
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
      toast.success(`${voucher.voucherNumber} saved`)
      reset()
      onOpenChange(false)
    } catch (error) {
      toastActionError(
        error,
        kind === 'receipt' ? 'Receipt failed' : 'Payment failed',
      )
    }
  }

  const title = kind === 'receipt' ? 'New receipt' : 'New payment'

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {kind === 'receipt'
              ? 'Money received from a customer.'
              : 'Money paid to a supplier.'}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-4 px-6"
          id="payment-voucher-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voucher-party">
              {kind === 'receipt' ? 'Customer' : 'Supplier'}
            </Label>
            <Select
              onValueChange={(value) => {
                setPartyId(value)
                setDraft({})
              }}
              value={partyId}
            >
              <SelectTrigger className="w-full" id="voucher-party">
                <SelectValue placeholder="Select party" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voucher-date">Date</Label>
              <DatePicker
                id="voucher-date"
                onChange={setVoucherDate}
                required
                value={voucherDate}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voucher-amount">Amount</Label>
              <Input
                className="font-mono tabular-nums"
                id="voucher-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                required
                value={amount}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voucher-mode">Mode</Label>
              <Select
                onValueChange={(value) =>
                  changeMode(value as PaymentVoucherMode)
                }
                value={mode}
              >
                <SelectTrigger className="w-full" id="voucher-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(
                      Object.keys(MODE_LABELS) as Array<PaymentVoucherMode>
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {MODE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voucher-account">
                {mode === 'cash' ? 'Cash ledger' : 'Bank ledger'}
              </Label>
              <Select onValueChange={setAccountId} value={accountId}>
                <SelectTrigger className="w-full" id="voucher-account">
                  <SelectValue placeholder="Select ledger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {cashBankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {mode === 'cash' ? null : (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="voucher-reference">
                  {mode === 'cheque' ? 'Cheque no.' : 'UTR / reference no.'}
                </Label>
                <Input
                  id="voucher-reference"
                  maxLength={80}
                  onChange={(event) => setReference(event.target.value)}
                  value={reference}
                />
              </div>
            )}
          </div>

          {partyId ? (
            <div className="flex flex-col gap-2" data-ui="data">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {kind === 'receipt' ? 'Open invoices' : 'Open bills'}
                </span>
                <Button
                  disabled={openDocuments.length === 0}
                  onClick={() =>
                    setDraft(allocateOldestFirst(amount, openDocuments))
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <WandSparklesIcon data-icon="inline-start" />
                  Adjust oldest first
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="w-28 text-right">Adjust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {document.number}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatIndianDate(document.date)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatInr(document.outstanding)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          aria-label={`Adjust against ${document.number}`}
                          className="h-8 text-right font-mono tabular-nums"
                          inputMode="decimal"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              [document.id]: event.target.value,
                            }))
                          }
                          value={draft[document.id] ?? ''}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {openDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-6 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        Nothing due. The full amount is kept as an advance.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Adjusted</dt>
                <dd
                  className={
                    summary.overAllocated
                      ? 'text-right font-mono text-destructive tabular-nums'
                      : 'text-right font-mono tabular-nums'
                  }
                >
                  {formatInr(summary.allocated)}
                </dd>
                <dt className="text-muted-foreground">Advance</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatInr(summary.advance)}
                </dd>
              </dl>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voucher-narration">Narration</Label>
            <Textarea
              id="voucher-narration"
              maxLength={500}
              onChange={(event) => setNarration(event.target.value)}
              rows={2}
              value={narration}
            />
          </div>
        </form>
        <SheetFooter>
          <Button
            disabled={post.isPending}
            form="payment-voucher-form"
            type="submit"
          >
            {kind === 'receipt' ? 'Save receipt' : 'Save payment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
